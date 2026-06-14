import { prisma } from '../../config/prisma.js';
import { Prisma } from '../../generated/prisma/client.js';

class FriendsRepository {
    findRequest = async (sentRequestsId: string, receivedRequestsId: string) => {
        return await prisma.userFriends.findUnique({
            where: {
                sentRequestsId_receivedRequestsId: {
                    sentRequestsId,
                    receivedRequestsId,
                },
            },
        });
    };

    findFriends = async (id: string) => {
        return await prisma.userFriends.findMany({
            where: {
                sentRequestsId: id,
            },
            include: {
                receivedRequests: {
                    include: {
                        profile: {
                            select: {
                                username: true,
                                displayUsername: true,
                                avatar_url: true,
                            },
                        },
                        userStats: true,
                    },
                    omit: {
                        password: true,
                        email: true,
                        emailVerified: true,
                        lastfmIntegrationId: true,
                    },
                },
            },
        });
    };

    findFriendsWithAlbum = async (id: string, albumId: string) => {
        const ids = await prisma.user
            .findMany({
                where: {
                    receivedRequests: {
                        some: {
                            stat: 'FRIEND',
                            sentRequestsId: id,
                        },
                    },
                },
                select: {
                    id: true,
                },
            })
            .then((res) => res.map((r) => r.id));

        ids.push(id);

        const pointsPerDay: Array<{ userId: string; max: number }> = await prisma.$queryRaw`
            SELECT
                "userId", MAX("totalSum") FROM (
                    SELECT "userId", SUM("bestScore") AS "totalSum"
                    FROM "UserAlbumScores"
                    WHERE "albumId" = ${albumId} AND "userId" IN (${Prisma.join(ids)})
                    GROUP BY DATE_TRUNC('day', "date"), "albumId", "userId"
                ) AS "TotalPoints"
            GROUP BY "userId"
        `;

        const friends = await prisma.user.findMany({
            where: {
                receivedRequests: {
                    some: {
                        stat: 'FRIEND',
                        sentRequestsId: id,
                    },
                },
                userAlbumStats: {
                    some: {
                        albumId,
                    },
                },
            },
            select: {
                id: true,
                profile: {
                    select: {
                        avatar_url: true,
                        username: true,
                        displayUsername: true,
                    },
                },
            },
        });

        const currentUser = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                profile: {
                    select: {
                        avatar_url: true,
                        username: true,
                        displayUsername: true,
                    },
                },
            },
        });

        const allUsers = currentUser ? [currentUser, ...friends] : friends;

        const friendsWithScore = allUsers.map((f) => {
            return {
                ...f,
                bestScore: Math.round(
                    Number(pointsPerDay.filter((p) => p.userId === f.id)[0]?.max) / 100
                ),
            };
        });

        return friendsWithScore;
    };

    findFriend = async (profileId: string, userId: string) => {
        const userSent = await prisma.userFriends.findFirst({
            where: {
                sentRequestsId: userId,
                receivedRequestsId: profileId,
            },
            include: {
                receivedRequests: {
                    select: {
                        profile: {
                            select: {
                                username: true,
                                displayUsername: true,
                            },
                        },
                    },
                },
                sentRequests: {
                    select: {
                        profile: {
                            select: {
                                username: true,
                                displayUsername: true,
                            },
                        },
                    },
                },
            },
        });

        const userReceived = await prisma.userFriends.findFirst({
            where: {
                receivedRequestsId: userId,
                sentRequestsId: profileId,
            },
            include: {
                receivedRequests: {
                    select: {
                        profile: {
                            select: {
                                username: true,
                                displayUsername: true,
                            },
                        },
                    },
                },
                sentRequests: {
                    select: {
                        profile: {
                            select: {
                                username: true,
                                displayUsername: true,
                            },
                        },
                    },
                },
            },
        });

        return userSent ?? userReceived;
    };

    makeRequest = async (id: string, friendId: string) => {
        return await prisma.userFriends.upsert({
            where: {
                sentRequestsId_receivedRequestsId: {
                    sentRequestsId: id,
                    receivedRequestsId: friendId,
                },
            },
            create: {
                stat: 'PENDING',
                sentRequestsId: id,
                receivedRequestsId: friendId,
            },
            update: {
                stat: 'PENDING',
                lastRequestedAt: new Date(),
                timesRequested: {
                    increment: 1,
                },
            },
        });
    };

    deleteAndMakeRequest = async (id: string, friendId: string) => {
        return await prisma.$transaction([
            prisma.userFriends.delete({
                where: {
                    sentRequestsId_receivedRequestsId: {
                        sentRequestsId: friendId,
                        receivedRequestsId: id,
                    },
                },
            }),
            prisma.userFriends.create({
                data: {
                    stat: 'PENDING',
                    sentRequestsId: id,
                    receivedRequestsId: friendId,
                },
            }),
        ]);
    };

    cancelRequest = async (id: string, friendId: string) => {
        return await prisma.userFriends.update({
            where: {
                sentRequestsId_receivedRequestsId: {
                    sentRequestsId: id,
                    receivedRequestsId: friendId,
                },
            },
            data: {
                stat: 'CANCELLED_REQUEST',
            },
        });
    };

    acceptRequest = async (id: string, friendId: string) => {
        return await prisma.$transaction([
            prisma.userFriends.update({
                where: {
                    sentRequestsId_receivedRequestsId: {
                        sentRequestsId: friendId,
                        receivedRequestsId: id,
                    },
                },
                data: {
                    stat: 'FRIEND',
                },
            }),
            prisma.userFriends.create({
                data: {
                    stat: 'FRIEND',
                    sentRequestsId: id,
                    receivedRequestsId: friendId,
                },
            }),
        ]);
    };

    denyRequest = async (id: string, friendId: string) => {
        return await prisma.userFriends.update({
            where: {
                sentRequestsId_receivedRequestsId: {
                    sentRequestsId: friendId,
                    receivedRequestsId: id,
                },
            },
            data: {
                stat: 'DENIED',
                timesRejected: {
                    increment: 1,
                },
            },
        });
    };

    deleteFriendship = async (id: string, friendId: string) => {
        return await prisma.$transaction([
            prisma.userFriends.delete({
                where: {
                    sentRequestsId_receivedRequestsId: {
                        sentRequestsId: friendId,
                        receivedRequestsId: id,
                    },
                },
            }),
            prisma.userFriends.delete({
                where: {
                    sentRequestsId_receivedRequestsId: {
                        sentRequestsId: id,
                        receivedRequestsId: friendId,
                    },
                },
            }),
        ]);
    };
}

export default FriendsRepository;

import { prisma } from '../../config/prisma.js';

class FriendsRepository {
    findUser = async (id: string) => {
        return await prisma.user.findUnique({
            where: {
                id,
            },
            select: {
                id: true,
            },
        });
    };

    findByUsername = async (username: string) => {
        return await prisma.profile.findUnique({
            where: {
                username,
            },
            include: {
                user: true,
            },
        });
    };

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
                                avatar_url: true,
                            },
                        },
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
                            },
                        },
                    },
                },
                sentRequests: {
                    select: {
                        profile: {
                            select: {
                                username: true,
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
                            },
                        },
                    },
                },
                sentRequests: {
                    select: {
                        profile: {
                            select: {
                                username: true,
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

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
        });
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

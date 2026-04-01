import { prisma } from '../../config/prisma.js';

class IntegrationRepository {
    findLastfmUserByUsername = async (lastfmUsername: string) => {
        return await prisma.lastFmIntegration.findUnique({
            where: {
                lastfmUsername,
            },
        });
    };

    connectLastfmUser = async (lastfmUsername: string, userId: string) => {
        return await prisma.$transaction([
            prisma.user.update({
                where: {
                    id: userId,
                },
                data: {
                    lastfmIntegrationId: null,
                },
            }),
            prisma.lastFmIntegration.upsert({
                where: {
                    lastfmUsername,
                },
                update: {
                    users: {
                        connect: {
                            id: userId,
                        },
                    },
                },
                create: {
                    lastfmUsername,
                    lastSyncedAt: new Date(),
                    users: {
                        connect: {
                            id: userId,
                        },
                    },
                },
            }),
        ]);
    };

    // upsertLastfmUsername = async (lastfmUsername: string, userId: string) => {
    //     return await prisma.lastFmIntegration.upsert({
    //         where: {
    //             lastfmUsername,
    //         },
    //         update: {
    //             users: {
    //                 connect: {
    //                     id: userId,
    //                 },
    //             },
    //         },
    //         create: {
    //             lastfmUsername,
    //             lastSyncedAt: new Date(),
    //             users: {
    //                 connect: {
    //                     id: userId,
    //                 },
    //             },
    //         },
    //     });
    // };

    // disconnectLastfmUsername = async (userId: string) => {
    //     return await prisma.user.update({
    //         where: {
    //             id: userId,
    //         },
    //         data: {
    //             lastfmIntegrationId: null,
    //         },
    //     });
    // };
}

export default IntegrationRepository;

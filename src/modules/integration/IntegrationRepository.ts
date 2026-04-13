import { prisma } from '../../config/prisma.js';

interface IUserAlbumFamiliarity {
    id: string;
    playcount: number;
    lastTimeListened: Date | null;
    tracksListened: number | null;
}

interface IUpdateSync {
    lastPageSynced: number;
    lastSyncedAt: Date;
}

class IntegrationRepository {
    findLastfmUserByUsername = async (lastfmUsername: string) => {
        return await prisma.lastFmIntegration.findUnique({
            where: {
                lastfmUsername,
            },
        });
    };

    findLastfmUserByUserId = async (id: string) => {
        return await prisma.user.findUnique({
            where: {
                id,
            },
            select: {
                lastfmIntegration: true,
            },
        });
    };

    findAlbums = async (id: string, rand: number) => {
        return await prisma.userAlbumFamiliarity.findMany({
            where: {
                lastFmIntegrationId: id,
            },
            include: {
                album: {
                    include: {
                        tracks: true,
                        genres: {
                            select: {
                                genre: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                timesListened: 'desc',
            },
            take: 50,
            skip: rand,
        });
    };

    countUserAlbums = async (id: string) => {
        return await prisma.userAlbumFamiliarity.count({
            where: {
                lastFmIntegrationId: id,
            },
        });
    };

    updateLastSynced = async (lastfmUsername: string, data: IUpdateSync) => {
        return await prisma.lastFmIntegration.update({
            where: {
                lastfmUsername,
            },
            data: {
                lastPageSynced: data.lastPageSynced,
                lastSyncedAt: data.lastSyncedAt,
            },
        });
    };

    getLasSyncedStats = async (lastfmUsername: string) => {
        return await prisma.lastFmIntegration.findUnique({
            where: {
                lastfmUsername,
            },
            select: {
                lastPageSynced: true,
                lastSyncedAt: true,
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
                    lastPageSynced: 0,
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

    syncAlbum = async (lastfmIntegrationId: string, album: IUserAlbumFamiliarity) => {
        await prisma.userAlbumFamiliarity.upsert({
            where: {
                lastFmIntegrationId_albumId: {
                    albumId: album.id,
                    lastFmIntegrationId: lastfmIntegrationId,
                },
            },
            create: {
                timesListened: album.playcount,
                lastTimeListened: album.lastTimeListened ?? new Date(),
                tracksListened: album.tracksListened ?? 0,
                albumId: album.id,
                lastFmIntegrationId: lastfmIntegrationId,
            },
            update: {
                timesListened: album.playcount,
            },
        });
    };
}

export default IntegrationRepository;

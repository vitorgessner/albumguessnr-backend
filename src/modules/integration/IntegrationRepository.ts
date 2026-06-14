import { prisma } from '../../config/prisma.js';
import { FailedAlbumsSyncCreateInput } from '../../generated/prisma/models.js';
import { IUpdateSync } from './types/IUpdateSync.js';
import { IUserAlbumFamiliarity } from './types/IUserAlbumFamiliarity.js';

class IntegrationRepository {
    findLastfmUserByUsername = async (lastfmUsername: string) => {
        return await prisma.lastFmIntegration.findUnique({
            where: {
                lastfmUsername,
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
                        artists: {
                            include: {
                                artist: true,
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

    connectLastfmUser = async (
        lastfmUsername: string,
        lastfmDisplayUsername: string,
        userId: string
    ) => {
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
                    lastfmDisplayUsername,
                    users: {
                        connect: {
                            id: userId,
                        },
                    },
                },
                create: {
                    lastfmUsername,
                    lastfmDisplayUsername,
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

    saveFailedSync = async (albumData: FailedAlbumsSyncCreateInput) => {
        return await prisma.failedAlbumsSync.upsert({
            where: {
                albumName_artist_apiError: {
                    albumName: albumData.albumName,
                    artist: albumData.artist,
                    apiError: albumData.apiError,
                },
            },
            create: {
                ...albumData,
            },
            update: {
                ...albumData,
            },
        });
    };
}

export default IntegrationRepository;

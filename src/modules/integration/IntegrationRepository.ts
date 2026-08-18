import { prisma } from '../../config/prisma.js';
import { FailedAlbumsSyncCreateInput } from '../../generated/prisma/models.js';
import { IUpdateSync } from './types/IUpdateSync.js';
import { IUserAlbumFamiliarity } from './types/IUserAlbumFamiliarity.js';

class IntegrationRepository {
    findMainProvider = async (userId: string) => {
        return await prisma.user.findUnique({
            where: {
                id: userId,
            },
            select: {
                mainAccount: true,
            },
        });
    };

    editTokens = async (
        provider: string,
        providerAccountId: string,
        tokens: { accessToken: string; refreshToken: string; expiresAt: Date }
    ) => {
        return await prisma.account.update({
            where: {
                provider_providerAccountId: {
                    provider,
                    providerAccountId,
                },
            },
            data: {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                expiresAt: tokens.expiresAt,
            },
        });
    };

    findAlbums = async (id: string, rand: number) => {
        return await prisma.userAlbumFamiliarity.findMany({
            where: {
                userId: id,
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
                userId: id,
            },
        });
    };

    updateLastSynced = async (provider: string, providerId: string, data: Partial<IUpdateSync>) => {
        return await prisma.account.update({
            where: {
                provider_providerAccountId: {
                    provider,
                    providerAccountId: providerId,
                },
            },
            data: {
                ...data,
            },
        });
    };

    getLastSyncedStats = async (provider: string, providerId: string) => {
        return await prisma.account.findUnique({
            where: {
                provider_providerAccountId: {
                    provider,
                    providerAccountId: providerId,
                },
            },
            select: {
                lastSyncedAt: true,
                syncCursor: true,
                syncingTimestamp: true,
                syncStatus: true,
                hadFailuresInChain: true,
            },
        });
    };

    // connectLastfmUser = async (
    //     lastfmUsername: string,
    //     lastfmDisplayUsername: string,
    //     userId: string
    // ) => {
    //     return await prisma.$transaction([
    //         prisma.user.update({
    //             where: {
    //                 id: userId,
    //             },
    //             data: {
    //                 lastfmIntegrationId: null,
    //             },
    //         }),
    //         prisma.lastFmIntegration.upsert({
    //             where: {
    //                 lastfmUsername,
    //             },
    //             update: {
    //                 lastfmDisplayUsername,
    //                 users: {
    //                     connect: {
    //                         id: userId,
    //                     },
    //                 },
    //             },
    //             create: {
    //                 lastfmUsername,
    //                 lastfmDisplayUsername,
    //                 lastPageSynced: 0,
    //                 lastSyncedAt: new Date(),
    //                 users: {
    //                     connect: {
    //                         id: userId,
    //                     },
    //                 },
    //             },
    //         }),
    //     ]);
    // };

    syncAlbum = async (userId: string, album: IUserAlbumFamiliarity) => {
        await prisma.userAlbumFamiliarity.upsert({
            where: {
                userId_albumId: {
                    albumId: album.id,
                    userId,
                },
            },
            create: {
                timesListened: album.playcount,
                lastTimeListened: album.lastTimeListened ?? new Date(),
                tracksListened: album.tracksListened ?? 0,
                familiarityScore: album.familiarityScore,
                albumId: album.id,
                userId,
            },
            update: {
                timesListened: album.playcount,
                tracksListened: album.tracksListened ?? 0,
                familiarityScore: album.familiarityScore,
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

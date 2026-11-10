import { randomUUID } from 'node:crypto';
import { prisma } from '../../config/prisma.js';
import { FailedAlbumsSyncCreateInput } from '../../generated/prisma/models.js';
import { IUpdateSync } from './types/IUpdateSync.js';
import { IUserAlbumFamiliarity } from './types/IUserAlbumFamiliarity.js';
import { Prisma } from '../../generated/prisma/client.js';

class IntegrationRepository {
    findLastSyncedAt = async (userId: string) => {
        return await prisma.user.findUnique({
            where: {
                id: userId,
            },
            select: {
                lastAlbumsSync: true,
            },
        });
    };

    findProviders = async (userId: string) => {
        return await prisma.user.findUnique({
            where: {
                id: userId,
            },
            select: {
                accounts: true,
            },
        });
    };

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

    findScores = (userId: string) =>
        prisma.userAlbumFamiliarity.findMany({
            where: { userId, album: { hasCoverUrl: { not: 'FALSE' } } },
            select: { albumId: true, familiarityScore: true },
        });

    findAlbumsByIds = (userId: string, albumIds: string[]) =>
        prisma.userAlbumFamiliarity.findMany({
            where: { userId, albumId: { in: albumIds }, album: { hasCoverUrl: { not: 'FALSE' } } },
            include: {
                album: {
                    include: {
                        tracks: true,
                        genres: { include: { genre: true } },
                        artists: { include: { artist: true } },
                    },
                },
            },
        });

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
                user: {
                    update: {
                        lastAlbumsSync: new Date(),
                    },
                },
            },
        });
    };

    updateSyncingId = async (oldSyncingId: string | null | undefined) => {
        return await prisma.account.updateMany({
            where: {
                syncingId: oldSyncingId || null,
            },
            data: {
                syncingId: randomUUID(),
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
                syncingId: true,
            },
        });
    };

    syncAlbum = async (userId: string, album: IUserAlbumFamiliarity) => {
        await prisma.userAlbumFamiliarity.upsert({
            where: {
                userId_albumId: {
                    albumId: album.id,
                    userId,
                },
            },
            create: {
                familiarityScore: album.familiarityScore,
                albumId: album.id,
                userId,
            },
            update: {
                familiarityScore: album.familiarityScore,
            },
        });
    };

    saveFailedSync = async (albumData: FailedAlbumsSyncCreateInput) => {
        return await prisma.failedAlbumsSync.upsert({
            where: {
                albumName_artist_cause: {
                    albumName: albumData.albumName,
                    artist: albumData.artist,
                    cause: albumData.cause as Prisma.InputJsonValue,
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

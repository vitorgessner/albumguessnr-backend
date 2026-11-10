import IntegrationRepository from './IntegrationRepository.js';
import type AlbumRepository from '../album/AlbumRepository.js';
import IntegrationError from './errors/IntegrationError.js';
import ProfileRepository from '../profile/ProfileRepository.js';
import winston from 'winston';
import { sanitizeError } from '../../shared/utils/sanitizeCause.js';
import { INormalizedAlbum, ISavedAlbum } from '../album/types/album.js';
import { IProviderConnector } from './types/IProviderConnector.js';
import { PossibleApis } from '../../generated/prisma/enums.js';
import AuthError from '../auth/errors/AuthError.js';
import { pickAlbumIds } from './utils/pickAlbums.js';
import { IUpdateSync } from './types/IUpdateSync.js';
import axiosInstance from '../../config/axios.js';
import { logger } from '../../config/logger/logger.js';
import { normalizeAlbumName, normalizeArtistName } from './utils/normalize.js';
import { AxiosError } from 'axios';
import { coverArtRequest } from './providers/config/axiosInstances.js';

const apiMap: Record<string, PossibleApis> = {
    spotify: 'SPOTIFY',
    lastfm: 'LASTFM',
    musicbrainz: 'MUSICBRAINZ',
};

class IntegrationService {
    constructor(
        private integrationRepo: IntegrationRepository,
        private albumRepo: AlbumRepository,
        private profileRepo: ProfileRepository
    ) {}

    findAlbumOnDatabase = async (
        mbid: string,
        title: string,
        artist: string
    ): Promise<ISavedAlbum | null> => {
        const databaseAlbum = await this.albumRepo.getByMbid(mbid);

        if (!databaseAlbum) {
            const databaseAlbum = await this.albumRepo.getByTitleAndArtist(
                normalizeAlbumName(title),
                normalizeArtistName(artist)
            );

            return databaseAlbum;
        }

        return databaseAlbum;
    };

    findLastSyncedAt = async (userId: string) => {
        const user = await this.integrationRepo.findLastSyncedAt(userId);

        return user?.lastAlbumsSync;
    };

    findMainProvider = async (userId: string) => {
        const provider = await this.integrationRepo.findMainProvider(userId);
        if (!provider) throw new AuthError(404, 'A provider was not found');
        if (!provider.mainAccount) throw new AuthError(404, 'A main provider was not found');

        return provider.mainAccount;
    };

    fetchUserAlbums = async (userId: string, provider: IProviderConnector) => {
        const { provider: providerName, providerAccountId } = provider.getProfile();
        const syncingId = await provider.getSyncingId();

        const syncStats = await this.integrationRepo.getLastSyncedStats(
            providerName,
            providerAccountId
        );

        const isNewChain = !syncStats?.syncingTimestamp;
        const currentCursor = isNewChain ? provider.getInitialCursor() : syncStats.syncCursor;
        const hadFailuresBeforeThisPage = isNewChain
            ? false
            : (syncStats.hadFailuresInChain ?? false);

        const STALE_AFTER_MS = 4 * 60 * 1000;
        const isStale =
            syncStats?.syncStatus === 'SYNCING' &&
            Date.now() - (syncStats.syncingTimestamp?.getTime() ?? Date.now()) > STALE_AFTER_MS;

        if (
            syncStats?.syncStatus === 'SYNCING' &&
            (!syncStats?.syncingId || syncStats.syncingId !== syncingId) &&
            !isStale
        ) {
            logger.warn('Already syncing');
            return false;
        }

        const updated = await this.integrationRepo.updateSyncingId(syncStats?.syncingId);
        if (updated.count !== 1) {
            logger.warn('Killing syncing concurrency');
            return false;
        }

        console.log('starting syncing on cursor: ' + currentCursor);

        if (isNewChain) {
            await this.integrationRepo.updateLastSynced(providerName, providerAccountId, {
                lastSyncedAt: new Date(Date.now()),
                syncCursor: provider.getInitialCursor(),
                syncStatus: 'SYNCING',
                syncingTimestamp: new Date(Date.now()),
                hadFailuresInChain: false,
            });
        }

        const { albums, syncCursor, hasNextPage } = await provider.fetchAlbums(currentCursor);

        const fulfilled = albums
            .filter((album) => album.status === 'to create')
            .map((album) => album.album);

        const rejectedAlbums = albums.filter((album) => album.status === 'failed');

        await Promise.all(
            rejectedAlbums.map(async (album) => {
                await this.saveFailedAlbumSync(
                    album.rawAlbum,
                    userId,
                    providerName,
                    logger,
                    album.error
                );
            })
        );

        const uniqueFulfilled = [
            ...new Map(fulfilled.map((a) => [a.mbid || a.normalizedName, a])).values(),
        ];

        await Promise.all(
            uniqueFulfilled.map(async (album) => {
                const childLogger = this.instantiateChildLogger(userId, album);

                const failedAlbumData = {
                    name: album.name,
                    artist: album.artists.map((artist) => artist.normalizedName).join(', '),
                    mbid: album.mbid,
                    normalizedAlbum: album.normalizedName,
                };

                if (!album.tracks || album.tracks.length <= 0) {
                    await this.saveFailedAlbumSync(
                        failedAlbumData,
                        userId,
                        providerName,
                        childLogger,
                        'Album returned no tracks'
                    );
                }

                if (!album.genres || album.genres.length <= 0) {
                    await this.saveFailedAlbumSync(
                        failedAlbumData,
                        userId,
                        providerName,
                        childLogger,
                        'Album returned no genres'
                    );
                }

                await this.createAndSyncNewAlbum(album, childLogger, userId, providerName);
            })
        );

        if (!hasNextPage || currentCursor === 450 || currentCursor === 10) {
            logger.info({
                message: 'Finished syncing albums',
                userId,
                fetched: currentCursor,
            });
            await this.integrationRepo.updateLastSynced(providerName, providerAccountId, {
                lastSyncedAt: new Date(Date.now()),
                syncCursor: provider.getInitialCursor(),
                syncStatus:
                    hadFailuresBeforeThisPage || rejectedAlbums.length > 0
                        ? 'SUCCEEDWITHFAILURE'
                        : 'SUCCESS',
                syncingTimestamp: null,
                syncingId: null,
            });
            return false;
        }

        if (hasNextPage) {
            await this.integrationRepo.updateLastSynced(providerName, providerAccountId, {
                syncCursor,
                hadFailuresInChain: hadFailuresBeforeThisPage || rejectedAlbums.length > 0,
                syncingTimestamp: new Date(),
            });
        }

        return hasNextPage;
    };

    getAlbums = async (id: string, total = 10, excludeIds: string[] = []) => {
        const user = await this.profileRepo.findByUserId(id);
        if (!user) throw new IntegrationError(404, 'User not found');

        const all = await this.integrationRepo.findScores(user.userId);
        const exclude = new Set(excludeIds);
        let candidates = all.filter((a) => !exclude.has(a.albumId));
        if (candidates.length < total) candidates = all;

        const ids = pickAlbumIds(candidates, total);
        const albums = await this.integrationRepo.findAlbumsByIds(user.userId, ids);
        const albumsWithCovers = await Promise.all(
            albums.map(async (a) => {
                return {
                    ...a,
                    album: {
                        ...a.album,
                        cover_url: await this.getCoverUrl(a.album.mbid ?? ''),
                    },
                };
            })
        );

        const byId = new Map(albumsWithCovers.map((a) => [a.albumId, a]));
        return ids.map((i) => byId.get(i)!).filter(Boolean);
    };

    getAlbumsQuantity = async (userId: string) => {
        const user = await this.profileRepo.findByUserId(userId);
        if (!user) throw new IntegrationError(404, 'User not found');

        const quantity = await this.integrationRepo.countUserAlbums(userId);

        return quantity;
    };

    editTokens = async (
        provider: string,
        providerAccountId: string,
        tokens: { accessToken: string; refreshToken: string; expiresAt: Date }
    ) => {
        return this.integrationRepo.editTokens(provider, providerAccountId, tokens);
    };

    syncAlbum = async (
        userId: string,
        album: { details: ISavedAlbum; familiarityScore: number },
        logger: winston.Logger,
        provider: string
    ) => {
        try {
            return await this.integrationRepo.syncAlbum(userId, {
                id: album.details.id,
                familiarityScore: album.familiarityScore,
            });
        } catch (err) {
            logger.error(
                new IntegrationError(500, 'Failed to sync album', {
                    cause: sanitizeError(err),
                })
            );
            await this.saveFailedAlbumSync(
                {
                    name: album.details.name,
                    mbid: album.details.mbid,
                    artist: album.details.normalizedArtist,
                    // eslint-disable-next-line max-len
                    normalizedAlbum: `${album.details.normalizedName} - ${album.details.normalizedArtist}`,
                },
                userId,
                provider,
                logger,
                err
            );
            return undefined;
        }
    };

    saveFailedAlbumSync = async (
        album: {
            name: string;
            mbid: string | null;
            artist: string;
            normalizedAlbum: string;
        },
        userId: string,
        apiError: string,
        logger: winston.Logger,
        err: unknown
    ) => {
        try {
            logger.info(`Saving ${album.name} to failedAlbumsSync`);
            await this.integrationRepo.saveFailedSync({
                albumName: album.name,
                apiError: apiMap[apiError] ?? 'SERVER',
                artist: album.artist,
                normalizedAlbum: album.normalizedAlbum,
                status: 'PENDING',
                mbid: album.mbid,
                cause: sanitizeError(err),
                user: {
                    connect: {
                        id: userId,
                    },
                },
            });
        } catch (err) {
            logger.error(
                new IntegrationError(500, 'Failed to save failed album sync', {
                    cause: sanitizeError(err),
                })
            );
        }
    };

    getLastSynced = async (provider: string, providerId: string) => {
        return await this.integrationRepo.getLastSyncedStats(provider, providerId);
    };

    updateLastSynced = async (provider: string, providerId: string, data: Partial<IUpdateSync>) => {
        return await this.integrationRepo.updateLastSynced(provider, providerId, {
            ...data,
        });
    };

    hasCoverUrl = async (mbid?: string): Promise<'release-group' | 'release' | null> => {
        for (const type of ['release-group', 'release'] as const) {
            try {
                await coverArtRequest(() =>
                    axiosInstance.head(`https://coverartarchive.org/${type}/${mbid}/front-500`)
                );
                return type;
            } catch (err) {
                if (err instanceof AxiosError && err.response?.status === 404) continue;
                throw err;
            }
        }
        return null;
    };

    getCoverUrl = async (mbid: string) => {
        const album = await this.albumRepo.getByMbid(mbid);
        if (!album || album.hasCoverUrl === 'FALSE') {
            throw new IntegrationError(404, 'Album or cover_url not found');
        }

        const type = {
            RELEASE_GROUP: 'release-group',
            RELEASE: 'release',
        };

        return `https://coverartarchive.org/${type[album.hasCoverUrl]}/${mbid}/front-500`;
    };

    private instantiateChildLogger = (userId: string, album: INormalizedAlbum) => {
        const childLogger = logger.child({
            requestId: userId,
            album: album.name,
            mbid: album.mbid,
            artist: album.artists.map((artist) => artist.normalizedName).join(', '),
            normalized: album.normalizedName + ', ' + album.normalizedArtist,
        });

        return childLogger;
    };

    private createAndSyncNewAlbum = async (
        album: INormalizedAlbum,
        logger: winston.Logger,
        userId: string,
        provider: string
    ) => {
        try {
            const newAlbum = await this.createNewAlbum(album);

            await this.integrationRepo.syncAlbum(userId, {
                id: newAlbum.id,
                familiarityScore: album.familiarityScore,
            });
        } catch (err) {
            logger.error(
                new IntegrationError(500, 'Failed to create and sync album', {
                    cause: sanitizeError(err),
                })
            );
            await this.saveFailedAlbumSync(
                {
                    name: album.name,
                    mbid: album.mbid,
                    artist: album.normalizedArtist,
                    normalizedAlbum: `${album.normalizedName} - ${album.normalizedArtist}`,
                },
                userId,
                provider,
                logger,
                err
            );
            return undefined;
        }
    };

    private createNewAlbum = async (album: INormalizedAlbum) => {
        const formattedTags = album.genres ?? [];
        const formattedArtists = album.artists ?? [];
        const formattedTracks = album.tracks ?? [];
        const hasCoverUrlType = {
            'release-group': 'RELEASE_GROUP',
            release: 'RELEASE',
        } as const;
        const newAlbum = await this.albumRepo.create(
            {
                mbid: album.mbid === '' ? null : album.mbid,
                name: album.name,
                normalizedName: album.normalizedName,
                normalizedArtist: album.normalizedArtist,
                year: album.year ?? null,
                hasCoverUrl: hasCoverUrlType[album.hasCoverUrl],
            },
            [...formattedTags],
            [...formattedArtists],
            [...formattedTracks]
        );

        return newAlbum;
    };
}

export default IntegrationService;

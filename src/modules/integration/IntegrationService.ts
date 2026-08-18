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

const apiMap: Record<string, PossibleApis> = {
    spotify: 'SPOTIFY',
    lastfm: 'LASTFM',
};

class IntegrationService {
    constructor(
        private integrationRepo: IntegrationRepository,
        private albumRepo: AlbumRepository,
        private profileRepo: ProfileRepository,
        private logger: winston.Logger
    ) {}

    findAlbumByTitleAndArtist = async (title: string, artist: string) => {
        const album = await this.albumRepo.getByTitleAndArtist(title, artist);

        return album;
    };

    findMainProvider = async (userId: string) => {
        const provider = await this.integrationRepo.findMainProvider(userId);
        if (!provider) throw new AuthError(404, 'A provider was not found');
        if (!provider.mainAccount) throw new AuthError(404, 'A main provider was not found');

        return provider.mainAccount;
    };

    fetchUserAlbums = async (userId: string, provider: IProviderConnector) => {
        const { provider: providerName, providerAccountId } = provider.getProfile();

        const syncStats = await this.integrationRepo.getLastSyncedStats(
            providerName,
            providerAccountId
        );

        if (syncStats?.syncStatus === 'SYNCING') {
            this.logger.warn('Already syncing');
            return false;
        }

        const isNewChain = !syncStats?.syncingTimestamp;
        const currentCursor = isNewChain ? provider.getInitialCursor() : syncStats.syncCursor;
        const hadFailuresBeforeThisPage = isNewChain
            ? false
            : (syncStats.hadFailuresInChain ?? false);

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

        const fullfilledAlbums = albums
            .filter((album) => album.status === 'to create')
            .map((album) => album.album);

        const rejectedAlbums = albums.filter((album) => album.status === 'failed');

        await Promise.all(
            rejectedAlbums.map(async (album) => {
                await this.saveFailedAlbumSync(
                    album.rawAlbum,
                    userId,
                    providerName,
                    this.logger,
                    album.error
                );
            })
        );

        await Promise.all(
            fullfilledAlbums.map(async (album) => {
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

                if (!album.year) {
                    await this.saveFailedAlbumSync(
                        failedAlbumData,
                        userId,
                        providerName,
                        childLogger,
                        'Album returned no year'
                    );
                }

                console.log('syncing: ' + album.normalizedName + ' - ' + album.normalizedArtist);
                await this.createAndSyncNewAlbum(album, childLogger, userId, providerName);
            })
        );

        // for (const album of fullfilledAlbums) {

        // }

        if (hasNextPage) {
            await this.integrationRepo.updateLastSynced(providerName, providerAccountId, {
                syncCursor,
                hadFailuresInChain: hadFailuresBeforeThisPage || rejectedAlbums.length > 0,
            });
        }

        if (!hasNextPage) {
            await this.integrationRepo.updateLastSynced(providerName, providerAccountId, {
                lastSyncedAt: new Date(Date.now()),
                syncCursor: provider.getInitialCursor(),
                syncStatus:
                    hadFailuresBeforeThisPage || rejectedAlbums.length > 0
                        ? 'SUCCEEDWITHFAILURE'
                        : 'SUCCESS',
                syncingTimestamp: null,
            });
        }
        return hasNextPage;
    };

    getAlbums = async (id: string) => {
        const user = await this.profileRepo.findByUserId(id);
        if (!user) throw new IntegrationError(404, 'User not found');

        console.log(user);

        const userAlbumsQtd = await this.integrationRepo.countUserAlbums(user.userId);

        const rand = userAlbumsQtd < 50 ? 0 : Math.floor(Math.random() * (userAlbumsQtd - 50));

        const albums = await this.integrationRepo.findAlbums(user.userId, rand);

        return albums;
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
        album: { details: ISavedAlbum; playcount: number | null; familiarityScore: number },
        logger: winston.Logger,
        provider: string
    ) => {
        try {
            return await this.integrationRepo.syncAlbum(userId, {
                id: album.details.id,
                playcount: album.playcount ? Number(album.playcount) : null,
                lastTimeListened: null,
                tracksListened: null,
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

    private saveFailedAlbumSync = async (
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
        logger.error(new IntegrationError(500, 'Failed album sync'));
        try {
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

    private instantiateChildLogger = (userId: string, album: INormalizedAlbum) => {
        const childLogger = this.logger.child({
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
                playcount: album.playcount ? Number(album.playcount) : null,
                lastTimeListened: null,
                tracksListened: null,
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
        const newAlbum = await this.albumRepo.create(
            {
                mbid: album.mbid === '' ? null : album.mbid,
                name: album.name,
                normalizedName: album.normalizedName,
                normalizedArtist: album.normalizedArtist,
                year: album.year ?? null,
                cover_url: album.cover_url,
            },
            [...formattedTags],
            [...formattedArtists],
            [...formattedTracks]
        );

        return newAlbum;
    };
}

export default IntegrationService;

import winston from 'winston';
import { Account } from '../../../../generated/prisma/client';
import { INormalizedArtist, INormalizedTag, INormalizedTrack } from '../../../album/types/album';
import IntegrationError from '../../errors/IntegrationError';
import { IProviderConnector } from '../../types/IProviderConnector';
import { ProfileDTO } from '../../types/ProfileDTO';
import {
    normalizeAlbumName,
    normalizeArtistName,
    normalizeTagName,
    normalizeTrackName,
} from '../../utils/normalize';
import { MusicBrainzWrapper } from '../../utils/MusicBrainzWrapper';
import {
    IAlbumTracksResponse,
    ISpotifyTopTrack,
    ITopTracksResponse,
} from '../interfaces/spotifyInterfaces';
import { IMBAlbum } from '../interfaces/musicBrainzInterfaces';
import { getApiInstances } from '../config/axiosInstances';
import { sanitizeError } from '../../../../shared/utils/sanitizeCause';
import { AlbumFormatResult } from '../interfaces/AlbumFormatResult';
import IntegrationService from '../../IntegrationService';

export class SpotifyWrapper implements IProviderConnector {
    private spotifyAxios;
    private musicBrainzCache = new Map<string, IMBAlbum | undefined | unknown>();
    constructor(
        private account: Account,
        private musicBrainz: MusicBrainzWrapper,
        private userId: string,
        private integrationService: IntegrationService,
        private logger: winston.Logger
    ) {
        this.logger = logger;
        const setup = getApiInstances();
        this.spotifyAxios = setup.spotifyAxios;
        setup.setupSpotifyInterceptor(this.getAccount, this.integrationService.editTokens);
    }

    getInitialCursor = (): number => 0;

    getProfile = (): ProfileDTO => {
        return {
            displayUsername: this.account.displayUsername,
            lastSyncedAt: this.account.lastSyncedAt,
            provider: this.account.provider,
            providerAccountId: this.account.providerAccountId,
            syncCursor: this.account.syncCursor,
            syncingTimestamp: this.account.syncingTimestamp,
            syncStatus: this.account.syncStatus,
            username: this.account.username,
            userId: this.account.userId,
            expiresAt: this.account.expiresAt,
            accessToken: null,
            refreshToken: null,
        };
    };

    fetchAlbums = async (
        syncCursor: number = this.getInitialCursor()
    ): Promise<{
        albums: AlbumFormatResult[];
        hasNextPage: boolean;
        syncCursor: number;
    }> => {
        try {
            const response = await this.spotifyAxios.get<ITopTracksResponse>('me/top/tracks', {
                headers: {
                    Authorization: `Bearer ${this.account.accessToken}`,
                },
                params: {
                    offset: syncCursor,
                    time_range: 'long_term',
                    limit: 50,
                },
            });

            const { total, items } = response.data;

            const uniqueAlbums = this.deduplicateAlbums(items);
            const albums = await Promise.all(
                uniqueAlbums.map((album, i) => this.formatAlbum(album, i + syncCursor + 1, total))
            );

            return {
                hasNextPage: syncCursor < total,
                syncCursor: syncCursor + 50,
                albums,
            };
        } catch (err) {
            this.logger.error(`Failed to fetch albums on cursor ${syncCursor}`, err);
            return {
                albums: [],
                hasNextPage: false,
                syncCursor: 0,
            };
        }
    };

    private deduplicateAlbums = (items: { album: ISpotifyTopTrack }[]) => {
        const albumsMap = new Map<string, ISpotifyTopTrack>();
        items.forEach((item) => albumsMap.set(item.album.id, item.album));

        return Array.from(albumsMap.values());
    };

    private formatAlbum = async (
        album: ISpotifyTopTrack,
        i: number,
        total: number
    ): Promise<AlbumFormatResult> => {
        try {
            const childLogger = this.instantiateChildLogger(this.userId, album);
            if (!album.images[0]) {
                childLogger.error(new IntegrationError(404, 'Cover_url not found'));
                throw new IntegrationError(404, 'Cover_url not found');
            }

            const normalizedArtists = this.normalizeArtistsNames(album.artists);
            const normalizedArtist = normalizedArtists
                .map((artist) => artist.normalizedName)
                .join(', ');
            const normalizedTitle = normalizeAlbumName(album.name);

            const savedAlbum = await this.integrationService.findAlbumByTitleAndArtist(
                normalizedTitle,
                normalizedArtist
            );

            if (savedAlbum) {
                await this.integrationService.syncAlbum(
                    this.userId,
                    { details: savedAlbum, playcount: null, familiarityScore: 1 - i / total },
                    childLogger,
                    'spotify'
                );
                return { status: 'synced' };
            }

            const tracks = await this.fetchAlbumTracks(album.id, childLogger);
            const genres = await this.fetchAlbumTags(
                normalizeAlbumName(album.name),
                childLogger,
                normalizedArtists[0]?.normalizedName
            );

            const normalizedAlbum = {
                name: album.name,
                cover_url: album.images[0].url,
                mbid: null,
                year: new Date(album.release_date).getFullYear().toString(),
                normalizedName: normalizeAlbumName(album.name),
                artists: normalizedArtists,
                normalizedArtist,
                tracks,
                genres,
                playcount: null,
                familiarityScore: 1 - i / total,
            };

            return { status: 'to create', album: normalizedAlbum };
        } catch (err) {
            const rawAlbum = {
                name: album.name,
                mbid: null,
                artist: album.artists.map((artist) => artist.name).join(', '),
                normalizedAlbum:
                    normalizeAlbumName(album.name) +
                    -' - ' +
                    album.artists.map((artist) => normalizeArtistName(artist.name)).join(', '),
            };
            return { status: 'failed', rawAlbum, error: err };
        }
    };

    private instantiateChildLogger = (userId?: string, album?: ISpotifyTopTrack) => {
        const childLogger = this.logger.child({
            requestId: userId,
            album: album?.name,
            albumId: album?.id,
            artist: album?.artists[0]?.name,
            provider: SpotifyWrapper.name,
        });

        return childLogger;
    };

    private normalizeArtistsNames = (artists: { name: string }[]): INormalizedArtist[] => {
        const normalizedArtists = artists.map((a) => {
            return {
                mbid: null,
                name: a.name,
                normalizedName: normalizeArtistName(a.name),
            };
        });

        return normalizedArtists;
    };

    private fetchAlbumTracks = async (
        id: string,
        childLogger: winston.Logger
    ): Promise<INormalizedTrack[]> => {
        try {
            const response = await this.spotifyAxios.get<IAlbumTracksResponse>(
                `albums/${id}/tracks`,
                {
                    headers: {
                        Authorization: `Bearer ${this.account.accessToken}`,
                    },
                }
            );

            if (
                !response ||
                !response.data ||
                !response.data.items ||
                response.data.items.length <= 0
            ) {
                childLogger.warn(new IntegrationError(404, 'Album returned no tracks'));
            }

            const tracks = response.data.items.map((item) => {
                return {
                    name: item.name,
                    normalizedName: normalizeTrackName(item.name),
                };
            });

            return tracks;
        } catch (err) {
            childLogger.error(
                new IntegrationError(500, 'Failed to fetch albums tracks', {
                    cause: sanitizeError(err),
                })
            );
            return [];
        }
    };

    private fetchAlbumTags = async (
        name: string,
        childLogger: winston.Logger,
        artist?: string
    ): Promise<INormalizedTag[]> => {
        const musicBrainzAlbum = await this.fetchMusicBrainzAlbum(name, artist ?? '', childLogger);

        if (!musicBrainzAlbum || !musicBrainzAlbum.tags || musicBrainzAlbum.tags.length <= 0)
            return [];

        const tags = musicBrainzAlbum.tags.map((tag) => {
            return { name: normalizeTagName(tag.name) };
        });

        return tags;
    };

    private fetchMusicBrainzAlbum = async (
        title: string,
        artist: string,
        childLogger: winston.Logger
    ): Promise<IMBAlbum | undefined> => {
        const cacheKey = `${artist.toLowerCase()}:${title.toLowerCase()}`;

        if (this.musicBrainzCache.has(cacheKey)) {
            const cached = this.musicBrainzCache.get(cacheKey);
            if (cached instanceof Error) throw cached;
            return cached as IMBAlbum | undefined;
        }

        try {
            const musicBrainzAlbum = await this.musicBrainz.fetchAlbum(title, artist);
            if (!musicBrainzAlbum) {
                childLogger.warn(
                    new IntegrationError(404, 'Album not found on MusicBrainz (impact tags)')
                );
            }

            this.musicBrainzCache.set(cacheKey, musicBrainzAlbum);
            return musicBrainzAlbum;
        } catch (error) {
            this.musicBrainzCache.set(cacheKey, error);
            throw error;
        }
    };

    private getAccount = async () => {
        return {
            provider: this.account.provider,
            providerAccountId: this.account.providerAccountId,
            refreshToken: this.account.refreshToken,
        };
    };
}

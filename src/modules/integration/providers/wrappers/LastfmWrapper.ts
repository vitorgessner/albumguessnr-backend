import winston from 'winston';
import { Account } from '../../../../generated/prisma/client';
import { INormalizedTag, INormalizedTrack } from '../../../album/types/album';
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
import { IAlbumInfo, ITopAlbumResponse, ITopAlbumsResponse } from '../interfaces/lastfmInterfaces';
import { IMBAlbum } from '../interfaces/musicBrainzInterfaces';
import { getApiInstances, lfRequest } from '../config/axiosInstances';
import { sanitizeError } from '../../../../shared/utils/sanitizeCause';
import { AlbumFormatResult } from '../interfaces/AlbumFormatResult';
import IntegrationService from '../../IntegrationService';
import { md5 } from '../../../../shared/utils/md5';
import { env } from '../../../../app';
import AuthError from '../../../auth/errors/AuthError';

export class LastfmWrapper implements IProviderConnector {
    private lastfmAxios;
    private totalPages: number = 1;
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
        this.lastfmAxios = setup.lastfmAxios;
    }

    getInitialCursor = (): number => 1;

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
            syncingId: this.account.syncingId,
        };
    };

    fetchAlbums = async (
        syncCursor: number = this.getInitialCursor()
    ): Promise<{
        albums: AlbumFormatResult[];
        hasNextPage: boolean;
        syncCursor: number;
    }> => {
        const { totalPages, items } = await this.fetchTopAlbums(syncCursor);
        this.totalPages = totalPages;

        const albums = await Promise.all(
            items.map((item, i) => this.formatAlbum(item, i + (syncCursor - 1) * 50))
        );

        return {
            hasNextPage: syncCursor <= totalPages,
            syncCursor: syncCursor + 1,
            albums,
        };
    };

    private fetchTopAlbums = async (syncCursor: number) => {
        if (!this.account.accessToken) {
            throw new AuthError(
                401,
                'User has not a token for Last.fm, try logging in Last.fm again'
            );
        }

        const signature = md5(
            // eslint-disable-next-line max-len
            `api_key${env.API_KEY}methoduser.gettopalbumspage${syncCursor}sk${this.account.accessToken}user${this.account.username}${env.LASTFM_CLIENT_SECRET}`
        );

        const response = await lfRequest(() =>
            this.lastfmAxios.get<ITopAlbumsResponse>('', {
                params: {
                    method: 'user.gettopalbums',
                    api_sig: signature,
                    sk: this.account.accessToken,
                    user: this.account.username,
                    page: syncCursor,
                },
            })
        );

        const { total, totalPages } = response.data.topalbums['@attr'];
        const { album: items } = response.data.topalbums;

        return { total, totalPages, items };
    };

    private formatAlbum = async (
        album: ITopAlbumResponse,
        i: number
    ): Promise<AlbumFormatResult> => {
        try {
            const childLogger = this.instantiateChildLogger(this.userId, album);

            const normalizedArtist = normalizeArtistName(album.artist.name);
            const normalizedTitle = normalizeAlbumName(album.name);

            const savedAlbum = await this.integrationService.findAlbumByTitleAndArtist(
                normalizedTitle,
                normalizedArtist
            );

            if (savedAlbum) {
                await this.integrationService.syncAlbum(
                    this.userId,
                    {
                        details: savedAlbum,
                        playcount: Number(album.playcount),
                        familiarityScore: this.calculateFamiliarityScore(i),
                    },
                    childLogger,
                    'lastfm'
                );
                return { status: 'synced' };
            }

            if (!album.image || !album.image[0]) {
                await this.integrationService.saveFailedAlbumSync(
                    {
                        artist: album.artist.name,
                        name: album.name,
                        mbid: album.mbid,
                        normalizedAlbum: normalizeAlbumName(album.name),
                    },
                    this.userId,
                    'lastfm',
                    childLogger,
                    'Album returned no cover image'
                );
                throw new IntegrationError(404, 'Cover_url not found');
            }

            const cover_url = this.getCoverUrl(album);

            const musicBrainzAlbum = await this.fetchMusicBrainzAlbum(
                album.name,
                album.artist.name,
                childLogger
            );

            const hasNormalizedArtists = await this.normalizeArtists(musicBrainzAlbum);

            const normalizedArtists =
                hasNormalizedArtists && hasNormalizedArtists.length >= 1
                    ? hasNormalizedArtists
                    : [
                          {
                              mbid: album.artist.mbid,
                              name: album.artist.name,
                              normalizedName: normalizeArtistName(album.artist.name),
                          },
                      ];

            const normalizedMusicBrainzArtist = normalizedArtists
                ?.map((artist) => artist.normalizedName)
                .join(', ');

            const savedAlbumAfterMusicBrainz =
                await this.integrationService.findAlbumByTitleAndArtist(
                    normalizedTitle,
                    normalizedMusicBrainzArtist
                );

            if (savedAlbumAfterMusicBrainz) {
                await this.integrationService.syncAlbum(
                    this.userId,
                    {
                        details: savedAlbumAfterMusicBrainz,
                        playcount: Number(album.playcount),
                        familiarityScore: this.calculateFamiliarityScore(i),
                    },
                    childLogger,
                    'lastfm'
                );
                return { status: 'synced' };
            }

            const lastfmAlbumInfo = album.mbid
                ? await this.fetchInfoWithMbid(album.mbid, childLogger)
                : await this.fetchInfoWithAlbumData(
                      normalizeAlbumName(album.name),
                      normalizeArtistName(album.artist.name),
                      childLogger
                  );

            const tracks = await this.fetchAlbumTracks(lastfmAlbumInfo, childLogger);
            const genres = await this.fetchAlbumTags(
                musicBrainzAlbum,
                lastfmAlbumInfo,
                childLogger
            );

            const year = musicBrainzAlbum ? this.getMusicBrainzAlbumYear(musicBrainzAlbum) : null;

            const normalizedAlbum = {
                name: album.name,
                cover_url,
                mbid: album.mbid,
                year,
                normalizedName: normalizeAlbumName(album.name),
                artists: normalizedArtists,
                normalizedArtist: normalizedMusicBrainzArtist,
                tracks,
                genres,
                playcount: Number(album.playcount),
                familiarityScore: this.calculateFamiliarityScore(i),
            };

            return { status: 'to create', album: normalizedAlbum };
        } catch (err) {
            const rawAlbum = {
                name: album.name,
                mbid: album.mbid,
                albumId: null,
                artist: album.artist.name,
                normalizedAlbum:
                    normalizeAlbumName(album.name) + ' - ' + normalizeArtistName(album.artist.name),
            };
            return { status: 'failed', rawAlbum, error: err };
        }
    };

    getCoverUrl = (album: ITopAlbumResponse | IAlbumInfo): string => {
        const cover_url = album.image[album.image.length - 1]?.['#text'];
        if (!cover_url) {
            throw new IntegrationError(404, 'Cover_url not found');
        }

        return cover_url;
    };

    private fetchMusicBrainzAlbum = async (
        title: string,
        artist: string,
        logger: winston.Logger
    ): Promise<IMBAlbum | undefined> => {
        const cacheKey = `${normalizeArtistName(artist)}:${normalizeAlbumName(title)}`;

        if (this.musicBrainzCache.has(cacheKey)) {
            const cached = this.musicBrainzCache.get(cacheKey);
            if (cached instanceof Error) {
                await this.integrationService.saveFailedAlbumSync(
                    {
                        artist,
                        mbid: null,
                        name: title,
                        normalizedAlbum: normalizeAlbumName(title),
                    },
                    this.userId,
                    'lastfm',
                    logger,
                    `Failed to fetch album from MusicBrainz. Error: ${cached.stack}`
                );
                throw cached;
            }
            return cached as IMBAlbum | undefined;
        }

        try {
            const musicBrainzAlbum = await this.musicBrainz.fetchAlbum(title, artist);
            if (!musicBrainzAlbum) {
                await this.integrationService.saveFailedAlbumSync(
                    {
                        artist,
                        mbid: null,
                        name: title,
                        normalizedAlbum: title,
                    },
                    this.userId,
                    'lastfm',
                    logger,
                    'Album not found on MusicBrainz (impact year, tags and maybe artists)'
                );
                logger.warn(
                    new IntegrationError(404, 'Album not found on MusicBrainz (impact tags)')
                );
            }

            this.musicBrainzCache.set(cacheKey, musicBrainzAlbum);
            return musicBrainzAlbum;
        } catch (error) {
            this.musicBrainzCache.set(cacheKey, error);
            await this.integrationService.saveFailedAlbumSync(
                {
                    artist,
                    mbid: null,
                    name: title,
                    normalizedAlbum: title,
                },
                this.userId,
                'lastfm',
                logger,
                `Failed to fetch album from MusicBrainz. Error: ${error}`
            );
            throw error;
        }
    };

    private instantiateChildLogger = (userId?: string, album?: ITopAlbumResponse) => {
        const childLogger = this.logger.child({
            requestId: userId,
            album: album?.name,
            mbid: album?.mbid,
            artist: album?.artist?.name,
            provider: LastfmWrapper.name,
        });

        return childLogger;
    };

    private normalizeArtists = async (album: IMBAlbum | undefined) => {
        if (!album) return null;

        const normalizedArtists = album['artist-credit'].map((artist) => {
            return {
                mbid: artist.artist.id,
                name: artist.name,
                normalizedName: normalizeArtistName(artist.name),
            };
        });

        return normalizedArtists;
    };

    private fetchAlbumTracks = async (
        info: IAlbumInfo | undefined,
        logger: winston.Logger
    ): Promise<INormalizedTrack[]> => {
        if (!info) {
            return [];
        }

        if (!info.tracks || !info.tracks.track) {
            logger.warn(new IntegrationError(404, 'Album returned no tracks'));
            return [];
        }

        if (Array.isArray(info.tracks.track) && info.tracks.track.length > 0) {
            return info.tracks.track.map((track) => {
                return {
                    name: track.name,
                    normalizedName: normalizeTrackName(track.name),
                };
            });
        }

        if (!Array.isArray(info.tracks.track)) {
            return [
                {
                    name: info.tracks.track.name,
                    normalizedName: normalizeTrackName(info.tracks.track.name),
                },
            ];
        }

        return [];
    };

    fetchInfoWithAlbumData = async (
        name: string,
        artist: string,
        logger?: winston.Logger
    ): Promise<IAlbumInfo | undefined> => {
        try {
            if (!this.account.accessToken) {
                throw new AuthError(
                    401,
                    'User has not a token for Last.fm, try logging in Last.fm again'
                );
            }

            const trimmedAlbum = name.trim();
            const trimmedArtist = artist.trim();

            const signature = md5(
                // eslint-disable-next-line max-len
                `album${trimmedAlbum}api_key${env.API_KEY}artist${trimmedArtist}methodalbum.getinfosk${this.account.accessToken}${env.LASTFM_CLIENT_SECRET}`
            );

            const response = await lfRequest(() =>
                this.lastfmAxios.get('', {
                    params: {
                        method: 'album.getinfo',
                        api_sig: signature,
                        sk: this.account.accessToken,
                        album: trimmedAlbum,
                        artist: trimmedArtist,
                    },
                })
            );

            const lastfmAlbumInfo: IAlbumInfo = response.data.album;

            if (!lastfmAlbumInfo) {
                logger?.warn(new IntegrationError(404, 'No info found on lastfm'));
            }

            return lastfmAlbumInfo;
        } catch (err) {
            throw new IntegrationError(500, 'Failed to fetch albums tracks', {
                cause: sanitizeError(err),
            });
        }
    };

    private fetchInfoWithMbid = async (
        mbid: string,
        logger: winston.Logger
    ): Promise<IAlbumInfo | undefined> => {
        try {
            if (!this.account.accessToken) {
                throw new AuthError(
                    401,
                    'User has not a token for Last.fm, try logging in Last.fm again'
                );
            }

            const signature = md5(
                // eslint-disable-next-line max-len
                `api_key${env.API_KEY}mbid${mbid}methodalbum.getinfosk${this.account.accessToken}${env.LASTFM_CLIENT_SECRET}`
            );

            const response = await lfRequest(() =>
                this.lastfmAxios.get('', {
                    params: {
                        method: 'album.getinfo',
                        api_sig: signature,
                        sk: this.account.accessToken,
                        mbid,
                    },
                })
            );

            const lastfmAlbumInfo: IAlbumInfo = response.data.album;

            return lastfmAlbumInfo;
        } catch (err) {
            logger.error(
                new IntegrationError(500, 'Failed to fetch albums tracks', {
                    cause: sanitizeError(err),
                })
            );
            return undefined;
        }
    };

    private fetchAlbumTags = async (
        album: IMBAlbum | undefined,
        lastfmAlbumInfo: IAlbumInfo | undefined,
        logger: winston.Logger
    ): Promise<INormalizedTag[]> => {
        if (!album && !lastfmAlbumInfo) {
            return [];
        }

        if (album && album.tags && album.tags.length > 0) {
            return album.tags.map((tag) => {
                return { name: normalizeTagName(tag.name) };
            });
        }

        if (
            lastfmAlbumInfo &&
            lastfmAlbumInfo.tags &&
            lastfmAlbumInfo.tags.tag &&
            Array.isArray(lastfmAlbumInfo.tags.tag)
        ) {
            return lastfmAlbumInfo.tags.tag.map((tag) => {
                return { name: normalizeTagName(tag.name) };
            });
        }

        if (
            lastfmAlbumInfo &&
            lastfmAlbumInfo.tags &&
            lastfmAlbumInfo.tags.tag &&
            !Array.isArray(lastfmAlbumInfo.tags.tag)
        ) {
            return [
                {
                    name: normalizeTagName(lastfmAlbumInfo.tags.tag.name),
                },
            ];
        }
        logger.warn(new IntegrationError(404, 'Album returned no tags'));
        return [];
    };

    private getMusicBrainzAlbumYear = (musicBrainzAlbum: IMBAlbum) => {
        return String(new Date(musicBrainzAlbum['first-release-date']).getFullYear());
    };

    private getAccount = async () => {
        return {
            provider: this.account.provider,
            providerAccountId: this.account.providerAccountId,
            refreshToken: this.account.refreshToken,
        };
    };

    private calculateFamiliarityScore = (i: number) => {
        return (Math.min(this.totalPages * 50, 500) - i) / Math.min(this.totalPages * 50, 500);
    };
}

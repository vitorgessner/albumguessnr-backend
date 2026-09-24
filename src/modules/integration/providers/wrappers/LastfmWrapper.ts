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
import { getApiInstances } from '../config/axiosInstances';
import { sanitizeError } from '../../../../shared/utils/sanitizeCause';
import { AlbumFormatResult } from '../interfaces/AlbumFormatResult';
import IntegrationService from '../../IntegrationService';
import { md5 } from '../../../../shared/utils/md5';
import { env } from '../../../../app';
import AuthError from '../../../auth/errors/AuthError';

export class LastfmWrapper implements IProviderConnector {
    private lastfmAxios;
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
        const { totalPages, items, topPlaycount } = await this.fetchTopAlbums(syncCursor);

        const albums = await Promise.all(items.map((item) => this.formatAlbum(item, topPlaycount)));

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

        const response = await this.lastfmAxios.get<ITopAlbumsResponse>('', {
            params: {
                method: 'user.gettopalbums',
                api_sig: signature,
                sk: this.account.accessToken,
                user: this.account.username,
                page: syncCursor,
            },
        });

        const { total, totalPages } = response.data.topalbums['@attr'];
        const { album: items } = response.data.topalbums;

        return { total, totalPages, items, topPlaycount: items[0]?.playcount };
    };

    private formatAlbum = async (
        album: ITopAlbumResponse,
        topPlaycount: string | undefined
    ): Promise<AlbumFormatResult> => {
        try {
            const childLogger = this.instantiateChildLogger(this.userId, album);

            if (!album.image || !album.image[0]) {
                childLogger.error(new IntegrationError(404, 'Cover_url not found'));
                throw new IntegrationError(404, 'Cover_url not found');
            }

            const cover_url = this.getCoverUrl(album, childLogger);

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
                        familiarityScore: Number(album.playcount) / Number(topPlaycount),
                    },
                    childLogger,
                    'lastfm'
                );
                return { status: 'synced' };
            }

            const musicBrainzAlbum = await this.fetchMusicBrainzAlbum(
                normalizedTitle,
                normalizedArtist
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
                        familiarityScore: Number(album.playcount) / Number(topPlaycount),
                    },
                    childLogger,
                    'lastfm'
                );
                return { status: 'synced' };
            }

            const info = album.mbid
                ? await this.fetchInfoWithMbid(album.mbid, childLogger)
                : await this.fetchInfoWithAlbumData(
                      normalizeAlbumName(album.name),
                      normalizeArtistName(album.artist.name),
                      childLogger
                  );

            const tracks = await this.fetchAlbumTracks(info, childLogger);
            const genres = await this.fetchAlbumTags(musicBrainzAlbum, info, childLogger);

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
                familiarityScore: Number(album.playcount) / Number(topPlaycount),
            };

            return { status: 'to create', album: normalizedAlbum };
        } catch (err) {
            const rawAlbum = {
                name: album.name,
                mbid: album.mbid,
                artist: album.artist.name,
                normalizedAlbum:
                    normalizeAlbumName(album.name) + ' - ' + normalizeArtistName(album.artist.name),
            };
            return { status: 'failed', rawAlbum, error: err };
        }
    };

    getCoverUrl = (album: ITopAlbumResponse | IAlbumInfo, logger?: winston.Logger): string => {
        const cover_url = album.image[album.image.length - 1]?.['#text'];
        if (!cover_url) {
            logger?.error(new IntegrationError(404, 'Cover_url not found'));
            throw new IntegrationError(404, 'Cover_url not found');
        }

        return cover_url;
    };

    private fetchMusicBrainzAlbum = async (
        title: string,
        artist: string
    ): Promise<IMBAlbum | undefined> => {
        try {
            const musicBrainzAlbum = await this.musicBrainz.fetchAlbum(title, artist);
            if (!musicBrainzAlbum) {
                this.logger.warn(
                    new IntegrationError(
                        404,
                        'Album not found on MusicBrainz (impact year, tags and maybe artists)'
                    )
                );
            }

            return musicBrainzAlbum;
        } catch (err) {
            this.logger.error(
                new IntegrationError(500, 'Failed to fetch album from MuscBrainz', {
                    cause: sanitizeError(err),
                })
            );
            return;
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

            const response = await this.lastfmAxios.get('', {
                params: {
                    method: 'album.getinfo',
                    api_sig: signature,
                    sk: this.account.accessToken,
                    album: trimmedAlbum,
                    artist: trimmedArtist,
                },
            });

            const info: IAlbumInfo = response.data.album;

            if (!info) {
                logger?.warn(new IntegrationError(404, 'No info found on lastfm'));
            }

            return info;
        } catch (err) {
            logger?.error(
                new IntegrationError(500, 'Failed to fetch albums tracks', {
                    cause: sanitizeError(err),
                })
            );
            return undefined;
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

            const response = await this.lastfmAxios.get('', {
                params: {
                    method: 'album.getinfo',
                    api_sig: signature,
                    sk: this.account.accessToken,
                    mbid,
                },
            });

            const info: IAlbumInfo = response.data.album;

            return info;
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
        info: IAlbumInfo | undefined,
        logger: winston.Logger
    ): Promise<INormalizedTag[]> => {
        if (!album && !info) {
            return [];
        }

        if (album && album.tags && album.tags.length > 0) {
            return album.tags.map((tag) => {
                return { name: normalizeTagName(tag.name) };
            });
        }

        if (info && info.tags && info.tags.tag && Array.isArray(info.tags.tag)) {
            return info.tags.tag.map((tag) => {
                return { name: normalizeTagName(tag.name) };
            });
        }

        if (info && info.tags && info.tags.tag && !Array.isArray(info.tags.tag)) {
            return [
                {
                    name: normalizeTagName(info.tags.tag.name),
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
}

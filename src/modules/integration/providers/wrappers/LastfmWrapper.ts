import { Account } from '../../../../generated/prisma/client';
import { INormalizedTag, INormalizedTrack } from '../../../album/types/album';
import IntegrationError from '../../errors/IntegrationError';
import { IProviderConnector } from '../../types/IProviderConnector';
import { ProfileDTO } from '../../types/ProfileDTO';
import { normalizeAlbumName, normalizeArtistName } from '../../utils/normalize';
import { ITopAlbumResponse, ITopAlbumsResponse } from '../interfaces/lastfmInterfaces';
import { IMBAlbum } from '../interfaces/musicBrainzInterfaces';
import { getApiInstances, lfRequest } from '../config/axiosInstances';
import { AlbumFormatResult } from '../interfaces/AlbumFormatResult';
import IntegrationService from '../../IntegrationService';
import { md5 } from '../../../../shared/utils/md5';
import { env } from '../../../../app';
import AuthError from '../../../auth/errors/AuthError';
import { logger } from '../../../../config/logger/logger';
import { musicBrainzWrapper } from '../../utils/MusicBrainzWrapper';
import { sanitizeError } from '../../../../shared/utils/sanitizeCause';

export class LastfmWrapper implements IProviderConnector {
    private lastfmAxios;
    private totalPages: number = 1;
    private musicBrainzCache = new Map<string, IMBAlbum | undefined | unknown>();
    private musicBrainz = musicBrainzWrapper;
    constructor(
        private account: Account,
        private userId: string,
        private integrationService: IntegrationService
    ) {
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

    getSyncingId = async () => {
        const lastSynced = await this.integrationService.getLastSynced(
            this.account.provider,
            this.account.providerAccountId
        );
        return lastSynced?.syncingId;
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
        console.log('formatting album: ', album.name);
        try {
            const syncStats = await this.integrationService.getLastSynced(
                this.account.provider,
                this.account.providerAccountId
            );

            if (this.passed15Seconds(syncStats?.syncingTimestamp)) {
                await this.integrationService.updateLastSynced(
                    this.account.provider,
                    this.account.providerAccountId,
                    {
                        syncingTimestamp: new Date(),
                    }
                );
            }

            const childLogger = this.instantiateChildLogger(this.userId, album);

            const savedAlbum = await this.integrationService.findAlbumOnDatabase(
                album.mbid,
                album.name,
                album.artist.name
            );

            if (savedAlbum) {
                console.log(savedAlbum.name, 'was already in database, syncing to user');
                await this.integrationService.syncAlbum(
                    this.userId,
                    {
                        details: savedAlbum,
                        familiarityScore: this.calculateFamiliarityScore(i),
                    },
                    childLogger,
                    'lastfm'
                );
                return { status: 'synced' };
            }

            const musicBrainzAlbumModel = await this.fetchMusicBrainzAlbum(
                album.mbid,
                album.name,
                album.artist.name
            );

            if (musicBrainzAlbumModel instanceof Error || !musicBrainzAlbumModel) {
                console.log(album.name, 'not found on musicbrainz');
                return {
                    status: 'failed',
                    rawAlbum: {
                        name: album.name,
                        mbid: album.mbid,
                        artist: album.artist.name,
                        normalizedAlbum: normalizeAlbumName(album.name),
                    },
                    error: musicBrainzAlbumModel,
                };
            }
            const { musicBrainzAlbum, tracks, genres, year } = musicBrainzAlbumModel;
            let { hasCoverUrl, mbid } = musicBrainzAlbumModel;

            if (hasCoverUrl === 'try release-group') {
                const response = await this.musicBrainz.fetchReleaseGroupByName(
                    album.name,
                    album.artist.name
                );

                const releaseGroupId = response.data['release-groups'][0]?.id;
                hasCoverUrl = await this.integrationService.hasCoverUrl(releaseGroupId);
                mbid = releaseGroupId;
            }

            if (!hasCoverUrl) {
                console.log(musicBrainzAlbum.title, 'has not a cover_url');
                return {
                    status: 'failed',
                    rawAlbum: {
                        name: album.name,
                        mbid: album.mbid,
                        artist: album.artist.name,
                        normalizedAlbum: normalizeAlbumName(album.name),
                    },
                    error: new IntegrationError(404, 'Cover image not found'),
                };
            }

            const savedMusicBrainzAlbum =
                await this.findMusicBrainzAlbumOnDatabase(musicBrainzAlbum);

            if (savedMusicBrainzAlbum) {
                console.log(
                    savedMusicBrainzAlbum.name,
                    'was found in the database after searching it on musicbrainz'
                );
                await this.integrationService.syncAlbum(
                    this.userId,
                    {
                        details: savedMusicBrainzAlbum,
                        familiarityScore: this.calculateFamiliarityScore(i),
                    },
                    childLogger,
                    'lastfm'
                );
                return { status: 'synced' };
            }

            const normalizedTracks = await this.getMusicBrainzTracks(tracks, musicBrainzAlbum);
            const normalizedGenres = await this.getMusicBrainzGenres(genres, musicBrainzAlbum);
            const normalizedYear = await this.getReleaseDateYear(year);

            const normalizedAlbum = {
                name: album.name,
                mbid:
                    mbid || musicBrainzAlbum.releases?.[0]?.id || musicBrainzAlbum.id || album.mbid,
                year: normalizedYear ?? null,
                normalizedName: normalizeAlbumName(musicBrainzAlbum.title),
                artists: this.normalizeArtists(musicBrainzAlbum),
                normalizedArtist: this.getNormalizedArtistsString(musicBrainzAlbum) ?? '',
                tracks: normalizedTracks,
                genres: normalizedGenres,
                familiarityScore: this.calculateFamiliarityScore(i),
                hasCoverUrl,
            };

            return {
                status: 'to create',
                album: normalizedAlbum,
            };
        } catch (err) {
            logger.error(sanitizeError(err));
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

    fetchMusicBrainzAlbum = async (
        mbid: string | undefined,
        title: string,
        artist: string
    ): Promise<ReturnType<typeof this.musicBrainz.fetchAlbum> | Error> => {
        const cacheKey = mbid
            ? `${mbid}`
            : `${normalizeArtistName(artist)}:${normalizeAlbumName(title)}`;

        if (this.musicBrainzCache.has(cacheKey)) {
            console.log(artist, title, ' was cached');
            const cached = this.musicBrainzCache.get(cacheKey);
            return cached as Promise<ReturnType<typeof this.musicBrainz.fetchAlbum> | Error>;
        }

        const promise = this.musicBrainz
            .fetchAlbum(mbid, title, artist)
            .then((res) => res ?? new IntegrationError(404, 'Album not found on MusicBrainz'))
            .catch((err) => err as Error);

        this.musicBrainzCache.set(cacheKey, promise);
        return promise;
    };

    fetchAlbumTracks = async (musicBrainzAlbum: IMBAlbum): Promise<INormalizedTrack[]> => {
        try {
            return await this.musicBrainz.fetchTracks(
                musicBrainzAlbum.releases?.[0]?.id || musicBrainzAlbum.id
            );
        } catch (err) {
            const title = normalizeAlbumName(musicBrainzAlbum.title);
            const artist = musicBrainzAlbum['artist-credit'][0];
            const normalizedArtist = normalizeArtistName(artist.name || artist.artist.name);
            logger.error(
                `Failed to fetch tracks on album: ${title}-${normalizedArtist}. err: ${err}`
            );
            return [];
        }
    };

    fetchAlbumTags = async (title: string, artist?: string) => {
        return await this.musicBrainz.fetchTags(title, artist);
    };

    private instantiateChildLogger = (userId?: string, album?: ITopAlbumResponse) => {
        const childLogger = logger.child({
            requestId: userId,
            album: album?.name,
            mbid: album?.mbid,
            artist: album?.artist?.name,
            provider: LastfmWrapper.name,
        });

        return childLogger;
    };

    private normalizeArtists = (album: Omit<IMBAlbum, 'releases'> | undefined) => {
        if (!album) return [];

        if (album['artist-credit']) {
            const normalizedArtists = album['artist-credit'].map((artist) => {
                return {
                    mbid: artist.artist.id,
                    name: artist.name || artist.artist.name,
                    normalizedName: normalizeArtistName(artist.name || artist.artist.name),
                };
            });

            return normalizedArtists;
        }

        return [];
    };

    private getNormalizedArtistsString = (musicBrainzAlbum: Omit<IMBAlbum, 'releases'>) => {
        const hasNormalizedArtists = this.normalizeArtists(musicBrainzAlbum);

        return hasNormalizedArtists?.map((artist) => artist.normalizedName).join(', ');
    };

    private findMusicBrainzAlbumOnDatabase = async (musicBrainzAlbum: IMBAlbum) => {
        const normalizedArtistsString = this.getNormalizedArtistsString(musicBrainzAlbum);
        const normalizedTitle = normalizeAlbumName(musicBrainzAlbum.title);

        return await this.integrationService.findAlbumOnDatabase(
            musicBrainzAlbum.releases?.[0]?.id || musicBrainzAlbum.id,
            normalizedTitle,
            normalizedArtistsString
        );
    };

    private getMusicBrainzGenres = async (
        genres: INormalizedTag[] | null,
        musicBrainzAlbum: Omit<IMBAlbum, 'releases'>
    ) => {
        console.log(musicBrainzAlbum.title, ': normalizing genres');
        if (genres && genres.length > 0) {
            return genres;
        }
        return await this.fetchAlbumTags(
            musicBrainzAlbum.title,
            musicBrainzAlbum['artist-credit'][0].name
        );
    };

    private getMusicBrainzTracks = async (
        tracks: INormalizedTrack[] | null,
        musicBrainzAlbum: IMBAlbum
    ) => {
        console.log(musicBrainzAlbum.title, ': normalizing tracks');
        if (tracks && tracks.length > 0) {
            return tracks;
        }
        return await this.fetchAlbumTracks(musicBrainzAlbum);
    };

    private getReleaseDateYear = async (year: string | undefined) => {
        return year ? year.split('-')[0] : null;
    };

    private calculateFamiliarityScore = (i: number) => {
        return (Math.min(this.totalPages * 50, 500) - i) / Math.min(this.totalPages * 50, 500);
    };

    private passed15Seconds = (syncingTimestamp?: Date | null) => {
        return Date.now() / 1000 - (syncingTimestamp?.getTime() ?? Date.now()) / 1000 >= 15;
    };
}

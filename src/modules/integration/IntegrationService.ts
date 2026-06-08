import IntegrationRepository from './IntegrationRepository.js';
import type AlbumRepository from '../album/AlbumRepository.js';
import AuthError from '../auth/errors/AuthError.js';
import ValidationError from '../../shared/errors/ValidationError.js';
import IntegrationError from './errors/IntegrationError.js';
import axios from '../../config/axios.js';
import { normalizeAlbumName, normalizeArtistName, normalizeTrackName } from './utils/normalize.js';
import type { IUserAlbum, IUserAlbumWithInfo } from './types/IUserAlbum.js';
import type { IAlbumInfo, IMBAlbum, IMBAlbumResponse } from './types/IAlbumInfo.js';
import type { INormalizedArtist, INormalizedTrack } from './types/normalizedTypes.js';
import ProfileRepository from '../profile/ProfileRepository.js';
import winston from 'winston';
import { ILastFmUser } from './types/ILastFmUser.js';
import { sanitizeError } from '../../shared/utils/sanitizeCause.js';

class IntegrationService {
    constructor(
        private integrationRepo: IntegrationRepository,
        private albumRepo: AlbumRepository,
        private profileRepo: ProfileRepository,
        private logger: winston.Logger
    ) {}

    connectLastfmUser = async (lastfmUsername: string = 'FishingDonut', userId?: string) => {
        if (!userId) throw new AuthError(401, 'Unauthorized');

        const trimmedUsername = lastfmUsername.trim();

        await this.lastFmUserExists(trimmedUsername);

        await this.integrationRepo.connectLastfmUser(trimmedUsername, userId);

        return { status: 'success', message: 'User connected' };
    };

    fetchUserAlbums = async (
        userId: string,
        lastfmUsername: string | undefined,
        cb: () => void
    ) => {
        const lastfmUser = await this.getLastFmUser(lastfmUsername);
        const { albums, nextPage } = await this.fetchTopAlbumsFromLastfm(lastfmUser);

        const normalizedAlbums = await this.normalizeAlbumsTitlesAndArtists(albums);
        let count = 1;

        for (const album of normalizedAlbums) {
            const childLogger = this.instantiateChildLogger(userId, album);
            childLogger.info('Fetching album ' + count++);

            const albumInfo = await this.fetchAlbumInfoFromLastfm(album, childLogger, userId);
            const musicBrainzAlbum = await this.fetchAlbumFromMusicBrainz(
                album,
                childLogger,
                userId
            );

            const year = musicBrainzAlbum?.['first-release-date'].split('-')[0];
            const tags = musicBrainzAlbum?.tags ?? albumInfo?.tags?.tag ?? [];

            const normalizedArtists = (await this.normalizeArtists(musicBrainzAlbum)) ?? [
                {
                    mbid: album.artist?.mbid,
                    name: album.artist?.name,
                    normalizedName: album.normalizedArtist,
                },
            ];

            const normalizedTracks = await this.normalizeTracks(albumInfo);

            await this.createAndSyncNewAlbum(
                lastfmUser.id,
                album,
                year,
                tags,
                normalizedArtists,
                normalizedTracks,
                childLogger,
                userId
            );
        }

        await this.integrationRepo.updateLastSynced(lastfmUser.lastfmUsername.trim(), {
            lastPageSynced: nextPage,
            lastSyncedAt: new Date(Date.now()),
        });
        cb();
    };

    getLastSyncedStats = async (lastfmUsername: string) => {
        const stats = await this.integrationRepo.getLasSyncedStats(lastfmUsername.trim());
        if (!stats) return null;

        return stats;
    };

    getLastfmUserByUserId = async (id: string) => {
        const lastfmUser = await this.profileRepo.findByUserId(id);
        if (!lastfmUser) return null;

        return lastfmUser;
    };

    getAlbums = async (id: string) => {
        const lastfmUser = await this.profileRepo.findByUserId(id);
        if (!lastfmUser) throw new IntegrationError(404, 'Lastfm user not found');

        const lastfmIntegrationId = lastfmUser.user.lastfmIntegration?.id;
        if (!lastfmIntegrationId) throw new IntegrationError(404, 'Lastfm integration not found');

        const userAlbumsQtd = await this.integrationRepo.countUserAlbums(lastfmIntegrationId);

        const rand = userAlbumsQtd < 50 ? 0 : Math.floor(Math.random() * (userAlbumsQtd - 50));

        const albums = await this.integrationRepo.findAlbums(lastfmIntegrationId, rand);

        return albums;
    };

    private saveFailedAlbumSync = async (
        album: IUserAlbumWithInfo,
        userId: string,
        apiError: 'LASTFM' | 'MUSICBRAINZ',
        logger: winston.Logger,
        err: unknown
    ) => {
        logger.error(
            new IntegrationError(500, 'Failed to fetch albums tracks', {
                cause: sanitizeError(err),
            })
        );

        try {
            await this.integrationRepo.saveFailedSync({
                albumName: album.name,
                apiError,
                artist: album.artist.name,
                normalizedAlbum: album.normalizedName + ' ' + album.normalizedArtist,
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

    private instantiateChildLogger = (userId: string, album: IUserAlbumWithInfo) => {
        const childLogger = this.logger.child({
            requestId: userId,
            album: album.name,
            mbid: album.mbid,
            artist: album.artist?.name,
            normalized: album.normalizedName + ', ' + album.normalizedArtist,
        });

        return childLogger;
    };

    private getLastFmUser = async (lastfmUsername: string | undefined) => {
        if (!lastfmUsername) {
            throw new ValidationError(400, 'LastFm username not specified');
        }

        const lastfmUser = await this.integrationRepo.findLastfmUserByUsername(lastfmUsername);
        if (!lastfmUser) {
            throw new IntegrationError(404, 'Lastfm User not found');
        }

        return lastfmUser;
    };

    private fetchAlbumInfoFromLastfm = async (
        album: IUserAlbumWithInfo,
        logger: winston.Logger,
        userId: string
    ) => {
        try {
            const info = album.mbid
                ? ((await this.findAlbumFromLastfmByMbid(album.mbid.trim())) ?? null)
                : ((await this.findAlbumFromLastfmByData(
                      album.normalizedName,
                      album.normalizedArtist
                  )) ?? null);

            if (!info || !info.tracks || !info.tracks.track) {
                logger.warn(new IntegrationError(404, 'Album returned no tracks'));
            }

            return info;
        } catch (err) {
            logger.error(
                new IntegrationError(500, 'Failed to fetch albums tracks', {
                    cause: sanitizeError(err),
                })
            );
            await this.saveFailedAlbumSync(album, userId, 'LASTFM', logger, err);
            return undefined;
        }
    };

    private fetchAlbumFromMusicBrainz = async (
        album: IUserAlbumWithInfo,
        logger: winston.Logger,
        userId: string
    ) => {
        try {
            const musicBrainzAlbum = await this.findAlbumFromMusicBrainz(
                album.normalizedName,
                album.normalizedArtist
            );

            if (!musicBrainzAlbum)
                logger.warn(
                    new IntegrationError(
                        404,
                        'Album not found on MusicBrainz (impact year and tags)'
                    )
                );

            return musicBrainzAlbum;
        } catch (err) {
            logger.error(
                new IntegrationError(500, 'Failed to fetch album on MusicBrainz', {
                    cause: sanitizeError(err),
                })
            );
            await this.saveFailedAlbumSync(album, userId, 'MUSICBRAINZ', logger, err);
            return undefined;
        }
    };

    private createAndSyncNewAlbum = async (
        lastfmUserId: string,
        album: IUserAlbumWithInfo,
        year: string | undefined,
        tags: Array<{ name: string }> | undefined,
        normalizedArtists: Array<INormalizedArtist> | null,
        normalizedTracks: Array<INormalizedTrack> | INormalizedTrack,
        logger: winston.Logger,
        userId: string
    ) => {
        try {
            const newAlbum = await this.createNewAlbum(
                album,
                year,
                tags,
                normalizedArtists,
                normalizedTracks
            );

            await this.integrationRepo.syncAlbum(lastfmUserId, {
                id: newAlbum.id,
                playcount: Number(album.playcount),
                lastTimeListened: null,
                tracksListened: null,
            });
        } catch (err) {
            logger.error(
                new IntegrationError(500, 'Failed to create and sync album', {
                    cause: sanitizeError(err),
                })
            );
            await this.saveFailedAlbumSync(album, userId, 'LASTFM', logger, err);
            return undefined;
        }
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

    private normalizeTracks = async (album: IAlbumInfo | undefined) => {
        if (!album || !album.tracks || !album.tracks.track) return [];

        if (!Array.isArray(album.tracks.track)) {
            const track = album.tracks.track;
            return {
                ...track,
                name: track.name,
                normalizedName: normalizeTrackName(track.name),
            };
        }

        const normalizedTracks = album.tracks.track.map((t) => {
            return {
                ...t,
                name: t.name,
                normalizedName: normalizeTrackName(t.name),
            };
        });

        return normalizedTracks;
    };

    private normalizeAlbumsTitlesAndArtists = async (albums: Array<IUserAlbum>) => {
        const normalizedArtists = albums.map((album) => {
            return {
                ...album,
                artist: {
                    ...album.artist,
                    normalizedName: normalizeArtistName(album.artist.name),
                },
                normalizedArtist: normalizeArtistName(album.artist.name),
            };
        });

        const normalizedAlbums = normalizedArtists.map((album) => {
            const cover_url = album.image[album.image.length - 1]?.['#text'] ?? '';
            return { ...album, cover_url, normalizedName: normalizeAlbumName(album.name) };
        });

        return normalizedAlbums;
    };

    private fetchTopAlbumsFromLastfm = async (lastFmUser: ILastFmUser) => {
        const trimmedUsername = lastFmUser.lastfmUsername.trim();
        const stats = await this.getLastSyncedStats(trimmedUsername);
        const nextPage = (stats?.lastPageSynced ?? 0) + 1;
        const response = await axios.get('', {
            params: {
                method: 'user.gettopalbums',
                user: trimmedUsername,
                page: nextPage,
            },
        });

        const albums: Array<IUserAlbum> = response.data.topalbums.album;
        if (!albums) throw new IntegrationError(404, 'No albums found');

        return { albums, nextPage };
    };

    private findAlbumFromLastfmByMbid = async (mbid: string) => {
        const trimmedMbid = mbid.trim();
        const response = await axios.get('', {
            params: {
                method: 'album.getinfo',
                mbid: trimmedMbid,
            },
        });

        const info: IAlbumInfo = response.data.album;
        return info;
    };

    private findAlbumFromLastfmByData = async (album: string, artist: string) => {
        const trimmedAlbum = album.trim();
        const trimmedArtist = artist.trim();
        const response = await axios.get('', {
            params: {
                method: 'album.getinfo',
                album: trimmedAlbum,
                artist: trimmedArtist,
            },
        });

        const info: IAlbumInfo = response.data.album;
        return info;
    };

    private findAlbumFromMusicBrainz = async (album: string, artist: string) => {
        const trimmedAlbum = album.trim();
        const trimmedArtist = artist.trim();
        const response = await axios.get<IMBAlbumResponse>('', {
            baseURL: 'https://musicbrainz.org/ws/2/release-group',
            params: {
                query: `album:${trimmedAlbum} AND 
                        artist:${trimmedArtist} AND 
                        (primarytype:album OR primarytype:ep)`,
                format: null,
                api_key: null,
            },
        });

        return response.data['release-groups'][0];
    };

    private createNewAlbum = async (
        album: IUserAlbumWithInfo,
        year: string | undefined,
        tags: Array<{ name: string }> | undefined,
        normalizedArtists: Array<INormalizedArtist> | null,
        normalizedTracks: Array<INormalizedTrack> | INormalizedTrack
    ) => {
        const formattedTags = tags ?? [];
        const formattedArtists = normalizedArtists ?? [];
        const formattedTracks = Array.isArray(normalizedTracks)
            ? normalizedTracks
            : [normalizedTracks];
        const newAlbum = await this.albumRepo.create(
            {
                mbid: album.mbid === '' ? null : album.mbid,
                name: album.name,
                normalizedName: album.normalizedName,
                normalizedArtist: album.normalizedArtist,
                year: year ?? null,
                cover_url: album.cover_url,
            },
            [...formattedTags],
            [...formattedArtists],
            [...formattedTracks]
        );

        return newAlbum;
    };

    private lastFmUserExists = async (lastfmUsername: string) => {
        const trimmedUsername = lastfmUsername.trim();
        const response = await axios.get('', {
            params: {
                method: 'user.getinfo',
                user: trimmedUsername,
            },
        });

        return response.data.user;
    };
}

export default IntegrationService;

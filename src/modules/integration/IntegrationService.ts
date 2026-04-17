/* eslint-disable prettier/prettier */
import IntegrationRepository from './IntegrationRepository.js';
import type AlbumRepository from '../album/AlbumRepository.js';
import AuthError from '../auth/errors/AuthError.js';
import ValidationError from '../../shared/errors/ValidationError.js';
import IntegrationError from './errors/IntegrationError.js';
import axios from '../../config/axios.js';
import {
    normalizeAlbumName,
    normalizeArtistName,
    normalizeTagName,
    normalizeTrackName,
} from './utils/normalize.js';
import type { IUserAlbum } from './types/IUserAlbum.js';
import type { IAlbumInfo, IMBAlbum, IMBAlbumResponse } from './types/IAlbumInfo.js';
import { AxiosError } from 'axios';

class IntegrationService {
    private integrationRepo: IntegrationRepository;
    private albumRepo: AlbumRepository;
    constructor(integrationRepo: IntegrationRepository, albumRepo: AlbumRepository) {
        this.integrationRepo = integrationRepo;
        this.albumRepo = albumRepo;
    }

    connectLastfmUser = async (lastfmUsername: string = 'FishingDonut', userId?: string) => {
        if (!userId) throw new AuthError(401, 'Unauthorized');

        const trimmedUsername = lastfmUsername.trim();

        await this.lastFmUserExists(trimmedUsername);

        try {
            await this.integrationRepo.connectLastfmUser(trimmedUsername, userId);
        } catch (err) {
            console.log(err);
            throw new IntegrationError(500, 'Error integrating lastfmUsername');
        }

        return { status: 'success', message: 'User connected' };
    };

    fetchUserAlbums = async (lastfmUsername: string | undefined, cb: Function) => {
        try {
            if (!lastfmUsername) throw new ValidationError(400, 'LastFm username not specified');

            const lastfmUser = await this.integrationRepo.findLastfmUserByUsername(lastfmUsername);
            if (!lastfmUser) throw new IntegrationError(404, 'Lastfm User not found');

            const { albums, nextPage } = await this.fetchTopAlbums(lastfmUsername);

            const normalizedAlbums = await this.normalizeAlbums(albums);

            for (const album of normalizedAlbums) {
                try {
                    const info = album.mbid
                        ? await this.fetchAlbumInforByMbid(album.mbid.trim())
                        : await this.fetchAlbumInfoByData(
                            album.normalizedName,
                            album.normalizedArtist
                        );

                    if (!info || !info.tracks || !info.tracks.track) continue;

                    const musicBrainzAlbum = await this.fetchAlbumMusicBrainz(
                        album.normalizedName,
                        album.normalizedArtist,
                    );

                    if (!musicBrainzAlbum) continue;

                    const year = musicBrainzAlbum['first-release-date'].split('-')[0];

                    const tags = musicBrainzAlbum.tags ?? [];

                    const topTag = tags.reduce((acc, curr) => {
                        if (acc.count < curr.count) {
                            return curr;
                        } else {
                            return acc;
                        }
                    }, tags[0]);

                    const topTwoTag = tags
                        .filter((tag) => tag.name !== topTag.name)
                        .reduce((acc, curr) => {
                            if (!acc) return;
                            if (acc.count < curr.count) {
                                return curr;
                            } else {
                                return acc;
                            }
                        }, tags.filter((tag) => tag.name !== topTag.name)[0]);

                    const topThreeTag = tags
                        .filter((tag) => tag.name !== topTag.name && tag.name !== topTwoTag?.name)
                        .reduce((acc, curr) => {
                            if (!acc) return;
                            if (acc.count < curr.count) {
                                return curr;
                            } else {
                                return acc;
                            }
                        }, tags.filter(
                            (tag) => tag.name !== topTag.name && tag.name !== topTwoTag?.name
                        )[0]);

                    const topTags = [topTag];
                    topTwoTag && topTags.push(topTwoTag);
                    topThreeTag && topTags.push(topThreeTag);

                    const normalizedTags = topTags.map((tag) => {
                        return {
                            name: normalizeTagName(tag.name),
                        };
                    });

                    const normalizedArtists = await this.normalizeArtists(musicBrainzAlbum);

                    const normalizedTracks = await this.normalizeTracks(info);
                    const normalizedSet = new Set();
                    const tracks = normalizedTracks.filter((t) => {
                        return (
                            !normalizedSet.has(t.normalizedName) &&
                            normalizedSet.add(t.normalizedName)
                        );
                    });
                    const newAlbum = await this.albumRepo.create(
                        {
                            mbid: album.mbid === '' ? null : album.mbid,
                            name: album.name,
                            normalizedName: album.normalizedName,
                            normalizedArtist: album.normalizedArtist,
                            year: year ?? null,
                            cover_url: album.cover_url,
                        },
                        [...normalizedTags],
                        [...normalizedArtists],
                        [...tracks]
                    );

                    await this.integrationRepo.syncAlbum(lastfmUser.id, {
                        id: newAlbum.id,
                        playcount: Number(album.playcount),
                        lastTimeListened: null,
                        tracksListened: null,
                    });
                } catch (err) {
                    if (err instanceof AxiosError && err.status === 404) {
                        console.log(err.config?.params['album'], err.config?.params['artist']);
                    } else {
                        console.log(err);
                    }
                }
            }

            await this.integrationRepo.updateLastSynced(lastfmUsername.trim(), {
                lastPageSynced: nextPage,
                lastSyncedAt: new Date(Date.now()),
            });
        } catch (err) {
            console.log(err);
        } finally {
            cb();
        }
    };

    getLastSyncedStats = async (lastfmUsername: string) => {
        const stats = await this.integrationRepo.getLasSyncedStats(lastfmUsername.trim());
        if (!stats) return null;

        return stats;
    };

    getLastfmUserByUserId = async (id: string) => {
        const lastfmUser = await this.integrationRepo.findLastfmUserByUserId(id);
        if (!lastfmUser) return null;

        return lastfmUser;
    };

    getAlbums = async (id: string) => {
        const lastfmUser = await this.integrationRepo.findLastfmUserByUserId(id);
        if (!lastfmUser) throw new IntegrationError(404, 'Lastfm user not found');

        const lastfmIntegrationId = lastfmUser.lastfmIntegration?.id;
        if (!lastfmIntegrationId) throw new IntegrationError(404, 'Lastfm integration not found');

        const userAlbumsQtd = await this.integrationRepo.countUserAlbums(lastfmIntegrationId);

        const rand = userAlbumsQtd < 50 ? 0 : Math.floor(Math.random() * (userAlbumsQtd - 50));

        const albums = await this.integrationRepo.findAlbums(lastfmIntegrationId, rand);

        return albums;
    };

    private normalizeArtists = async (album: IMBAlbum) => {
        const normalizedArtists = album['artist-credit'].map((artist) => {
            return {
                mbid: artist.artist.id,
                name: artist.name,
                normalizedName: normalizeArtistName(artist.name),
            };
        });

        return normalizedArtists;
    };

    private normalizeTracks = async (album: IAlbumInfo) => {
        const normalizedTracks = album.tracks.track.map((t) => {
            return {
                ...t,
                name: t.name,
                normalizedName: normalizeTrackName(t.name),
                artist: t.artist,
            };
        });

        return normalizedTracks;
    };

    private normalizeAlbums = async (albums: Array<IUserAlbum>) => {
        const normalizedArtists = albums.map((album) => {
            return {
                ...album,
                artist: { ...album.artist, normalizedName: normalizeArtistName(album.artist.name) },
                normalizedArtist: normalizeArtistName(album.artist.name),
            };
        });

        const normalizedAlbums = normalizedArtists.map((album) => {
            const cover_url = album.image[album.image.length - 1]?.['#text'] ?? '';
            return { ...album, cover_url, normalizedName: normalizeAlbumName(album.name) };
        });

        return normalizedAlbums;
    };

    private fetchTopAlbums = async (username: string) => {
        const trimmedUsername = username.trim();
        const stats = await this.getLastSyncedStats(username);
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

    fetchAlbumInforByMbid = async (mbid: string) => {
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

    fetchAlbumInfoByData = async (album: string, artist: string) => {
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

    fetchAlbumMusicBrainz = async (album: string, artist: string) => {
        const trimmedAlbum = album.trim();
        const trimmedArtist = artist.trim();
        const response = await axios.get<IMBAlbumResponse>('', {
            baseURL: 'https://musicbrainz.org/ws/2/release-group',
            params: {
                query: trimmedAlbum + ' ' + trimmedArtist,
                fomart: null,
                api_key: null,
            },
        });


        return response.data['release-groups'][0];
    };

    private findLastfmUser = async (lastfmUsername: string) => {
        const trimmedUsername = lastfmUsername.trim();
        return await this.integrationRepo.findLastfmUserByUsername(trimmedUsername);
    };

    private lastFmUserExists = async (lastfmUsername: string) => {
        const trimmedUsername = lastfmUsername.trim();
        const response = await axios.get('', {
            params: {
                method: 'user.getinfo',
                user: trimmedUsername,
            },
        });

        if (response.data.message === 'User not found')
            throw new IntegrationError(404, 'User not found');

        return response.data.user;
    };
}

export default IntegrationService;

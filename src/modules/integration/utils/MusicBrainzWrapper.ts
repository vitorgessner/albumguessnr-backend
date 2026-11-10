import axiosInstance from '../../../config/axios';
import { logger } from '../../../config/logger/logger';
import { INormalizedTag } from '../../album/types/album';
import IntegrationError from '../errors/IntegrationError';
import { coverArtRequest, getApiInstances, mbRequest } from '../providers/config/axiosInstances';
import {
    IMBAlbum,
    IMBAlbumResponse,
    IMBTrack,
    IMBTrackResponse,
} from '../providers/interfaces/musicBrainzInterfaces';
import {
    normalizeAlbumName,
    normalizeArtistName,
    normalizeTagName,
    normalizeTrackName,
} from './normalize';
import { AxiosError } from 'axios';

class MusicBrainzWrapper {
    private musicBrainzAxios;
    constructor() {
        this.musicBrainzAxios = getApiInstances().musicBrainzAxios;
    }

    fetchAlbum = async (mbid: string | undefined, name: string, artist?: string) => {
        if (mbid) {
            try {
                return await this.fetchByMbid(mbid);
            } catch (error) {
                if (
                    (error instanceof AxiosError && error.status === 404) ||
                    (error instanceof IntegrationError && error.statusCode === 404)
                ) {
                    return await this.fetchByName(name, artist);
                }
                return null;
            }
        }
        return await this.fetchByName(name, artist);
    };

    fetchTracks = async (releaseId: string) => {
        const response = await mbRequest(() =>
            this.musicBrainzAxios.get<IMBTrackResponse>(`/release/${releaseId}`, {
                params: {
                    inc: 'recordings',
                },
            })
        );

        return this.normalizeMusicBrainzTracks(response.data.media[0]?.tracks);
    };

    fetchTags = async (name: string, artist?: string) => {
        const normalizedTitle = normalizeAlbumName(name);
        const formattedArtist = normalizeArtistName(artist ?? '');

        try {
            const response = await this.fetchReleaseGroupByName(normalizedTitle, formattedArtist);

            const album = response.data['release-groups'][0];
            if (!album) {
                return [];
            }
            return this.normalizeMusicBrainzTags(album);
        } catch (err) {
            logger.error(
                `Failed to fetch tags on album: ${formattedArtist}-${normalizedTitle}. err: ${err}`
            );
            return [];
        }
    };

    private fetchByMbid = async (mbid: string) => {
        const response = await this.fetchReleaseByMbid(mbid);
        if (!response.data) {
            throw new IntegrationError(404, 'Releases not found on MusicBrainz');
        }

        const tracks = this.normalizeMusicBrainzTracks(response.data.media[0]?.tracks);
        const year =
            response.data.media[0]?.tracks[0]?.recording['first-release-date'] ||
            response.data.date;

        const hasCoverUrl = await this.hasCoverUrl(mbid);
        const finalMbid = response.data.id;
        if (!hasCoverUrl) {
            return {
                musicBrainzAlbum: response.data,
                tracks,
                genres: null,
                year,
                mbid: finalMbid,
                hasCoverUrl: 'try release-group' as const,
            };
        }
        return { musicBrainzAlbum: response.data, tracks, genres: null, year, hasCoverUrl };
    };

    private fetchReleaseByMbid = async (mbid: string) => {
        const response = await mbRequest(() =>
            this.musicBrainzAxios.get<IMBAlbum>(`/release/${mbid}`, {
                params: {
                    inc: 'artist-credits recordings',
                },
            })
        );

        return response;
    };

    private fetchByName = async (name: string, artist?: string) => {
        const normalizedTitle = normalizeAlbumName(name);
        const formattedArtist = normalizeArtistName(artist ?? '');
        try {
            const response = await this.fetchReleaseByName(normalizedTitle, formattedArtist);
            if (!response.data.releases?.[0]) {
                throw new IntegrationError(404, 'Releases not found on MusicBrainz');
            }

            const year = response.data.releases[0].date || response.data['first-release-date'];
            const hasCoverUrl = await this.hasCoverUrl(response.data.releases[0].id);
            const finalMbid = response.data.releases[0].id || response.data.id;
            if (!hasCoverUrl && response.data.releases[0]['release-group']) {
                const hasCoverUrl = await this.hasCoverUrl(
                    response.data.releases[0]['release-group'].id
                );
                const finalMbid = response.data.releases[0]['release-group'].id;
                return {
                    musicBrainzAlbum: response.data.releases?.[0],
                    tracks: null,
                    genres: null,
                    year,
                    mbid: finalMbid,
                    hasCoverUrl,
                };
            }
            return {
                musicBrainzAlbum: response.data.releases?.[0],
                tracks: null,
                genres: null,
                year,
                mbid: finalMbid,
                hasCoverUrl,
            };
        } catch (error) {
            if (
                (error instanceof AxiosError && error.status === 404) ||
                (error instanceof IntegrationError && error.statusCode === 404)
            ) {
                try {
                    const response = await this.fetchReleaseGroupByName(
                        normalizedTitle,
                        formattedArtist
                    );

                    const album = response.data['release-groups'][0];
                    if (!album) {
                        throw new IntegrationError(404, 'Album not found on MusicBrainz');
                    }
                    const genres = this.normalizeMusicBrainzTags(album);
                    const year = album['first-release-date'] || album.date;
                    const hasCoverUrl = await this.hasCoverUrl(album.id);
                    const finalMbid = album.id;
                    if (!hasCoverUrl && album.releases[0]) {
                        const hasCoverUrl = await this.hasCoverUrl(album.releases[0].id);
                        const finalMbid = album.releases[0].id;
                        return {
                            musicBrainzAlbum: album,
                            tracks: null,
                            genres,
                            year,
                            mbid: finalMbid,
                            hasCoverUrl,
                        };
                    }
                    return {
                        musicBrainzAlbum: album,
                        tracks: null,
                        genres,
                        year,
                        mbid: finalMbid,
                        hasCoverUrl,
                    };
                } catch (error) {
                    if (error instanceof AxiosError && error.status === 404) {
                        throw new IntegrationError(404, 'Album not found on MusicBrainz');
                    }
                    throw new IntegrationError(500, 'Album not found for unknown reasons');
                }
            }
            throw new IntegrationError(500, 'Album not found for unknown reasons');
        }
    };

    private fetchReleaseByName = async (title: string, artist?: string) => {
        const response = await mbRequest(() =>
            this.musicBrainzAxios.get<IMBAlbum>('/release', {
                params: {
                    query: `album:${title} AND 
                            artist:${artist} AND 
                            (primarytype:album OR primarytype:ep)`,
                    inc: 'artist-credits',
                },
            })
        );

        return response;
    };

    fetchReleaseGroupByName = async (title: string, artist?: string) => {
        const response = await mbRequest(() =>
            this.musicBrainzAxios.get<IMBAlbumResponse>('/release-group', {
                params: {
                    query: `album:${title} AND 
                            artist:${artist} AND 
                            (primarytype:album OR primarytype:ep)`,
                    inc: 'releases artist-credits',
                },
            })
        );

        return response;
    };

    normalizeMusicBrainzTracks = (tracks: IMBTrack[] | undefined) => {
        if (!tracks || tracks.length < 1) return [];

        const tracksSet = new Map();
        tracks.forEach((track) => {
            return tracksSet.set(
                normalizeTrackName(track.recording?.title || track.title),
                track.recording?.title || track.title
            );
        });

        const uniqueTracks = [...tracksSet.values()];

        return uniqueTracks.map((track) => {
            return {
                name: track,
                normalizedName: normalizeTrackName(track),
            };
        });
    };

    private normalizeMusicBrainzTags = (album: IMBAlbum | undefined): INormalizedTag[] => {
        if (!album) {
            return [];
        }

        if (album && album.tags && album.tags.length > 0) {
            return album.tags.map((tag) => {
                return { name: normalizeTagName(tag.name) };
            });
        }

        return [];
    };

    private hasCoverUrl = async (mbid: string): Promise<'release-group' | 'release' | null> => {
        for (const type of ['release-group', 'release'] as const) {
            try {
                await coverArtRequest(() =>
                    axiosInstance.head(`https://coverartarchive.org/${type}/${mbid}/front-500`)
                );
                return type;
            } catch (err) {
                if (err instanceof AxiosError && err.response?.status === 404) continue;
                // throw err;
                return null;
            }
        }
        return null;
    };
}

export const musicBrainzWrapper = new MusicBrainzWrapper();

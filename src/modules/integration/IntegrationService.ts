import type IntegrationRepository from './IntegrationRepository.js';
import type AlbumRepository from '../album/AlbumRepository.js';
import AuthError from '../auth/errors/AuthError.js';
import ValidationError from '../../shared/errors/ValidationError.js';
import IntegrationError from './errors/IntegrationError.js';
import axios from '../../config/axios.js';
import { normalizeAlbumName, normalizeArtistName } from './utils/normalize.js';

interface IFetchData {
    artist: {
        url: string;
        name: string;
        mbid: string;
    };
    image: [
        {
            size: string;
            '#text': string;
        },
    ];
    mbid: string;
    url: string;
    playcount: string;
    year: Date;
    '@attr': {
        rank: string;
    };
    name: string;
    normalizedName: string;
}

class IntegrationService {
    private integrationRepo: IntegrationRepository;
    private albumRepo: AlbumRepository;
    constructor(integrationRepo: IntegrationRepository, albumRepo: AlbumRepository) {
        this.integrationRepo = integrationRepo;
        this.albumRepo = albumRepo;
    }

    connectLastfmUser = async (lastfmUsername: string, userId?: string) => {
        if (!userId) throw new AuthError(401, 'Unauthorized');
        if (!lastfmUsername) lastfmUsername = 'FishingDonut';

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

    fetchUserAlbums = async (lastfmUsername: string | undefined) => {
        try {
            if (!lastfmUsername) throw new ValidationError(400, 'LastFm username not specified');

            const lastfmUser = await this.integrationRepo.findLastfmUserByUsername(lastfmUsername);
            if (!lastfmUser) throw new IntegrationError(404, 'Lastfm User not found');

            const { albums, nextPage } = await this.fetchTopAlbums(lastfmUsername);

            const normalizedAlbums = await this.normalizeAlbums(albums);

            for (const album of normalizedAlbums) {
                const newAlbum = await this.albumRepo.create(
                    {
                        mbid: album.mbid === '' ? null : album.mbid,
                        name: album.name,
                        normalizedName: album.normalizedName,
                        normalizedArtist: album.normalizedArtist,
                        year: album.year ?? new Date('1900-01-01'),
                        cover_url: album.cover_url,
                    },
                    [],
                    [album.artist]
                );

                await this.integrationRepo.syncAlbum(lastfmUser.id, {
                    id: newAlbum.id,
                    playcount: Number(album.playcount),
                    lastTimeListened: null,
                    tracksListened: null,
                });
            }

            await this.integrationRepo.updateLastSynced(lastfmUsername.trim(), {
                lastPageSynced: nextPage,
                lastSyncedAt: new Date(Date.now()),
            });
        } catch (err) {
            console.log(err);
        }
    };

    private normalizeArtists = async (albums: Array<IFetchData>) => {
        const normalizedArtists = albums.map((album) => {
            return {
                ...album,
                artist: { ...album.artist, normalizedName: normalizeArtistName(album.artist.name) },
                normalizedArtist: normalizeArtistName(album.artist.name),
            };
        });

        return normalizedArtists;
    };

    private normalizeAlbums = async (albums: Array<IFetchData>) => {
        const normalizedArtists = await this.normalizeArtists(albums);

        const normalizedAlbums = normalizedArtists.map((album) => {
            const cover_url = album.image[album.image.length - 1]?.['#text'] ?? '';
            return { ...album, cover_url, normalizedName: normalizeAlbumName(album.name) };
        });

        return normalizedAlbums;
    };

    private fetchTopAlbums = async (username: string) => {
        const trimmedUsername = username.trim();
        const lastPage =
            (await this.integrationRepo.getLastPageSynced(trimmedUsername))?.lastPageSynced ?? 0;
        const nextPage = lastPage + 1;
        const response = await axios.get('', {
            params: {
                method: 'user.gettopalbums',
                user: trimmedUsername,
                page: nextPage,
            },
        });

        const albums: Array<IFetchData> = response.data.topalbums.album;
        if (!albums) throw new IntegrationError(404, 'No albums found');

        return { albums, nextPage };
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

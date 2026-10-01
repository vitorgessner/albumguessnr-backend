import { DailyAlbumRepository } from './DailyAlbumRepository';
import Papa from 'papaparse';
import fs from 'fs/promises';
import * as z from 'zod';
import {
    normalizeAlbumName,
    normalizeArtistName,
    normalizeTagName,
    normalizeTrackName,
} from '../integration/utils/normalize';
import AlbumRepository, { ArtistCreateInputWithoutMbid } from '../album/AlbumRepository';
import IntegrationService from '../integration/IntegrationService';
import ValidationError from '../../shared/errors/ValidationError';
import IntegrationError from '../integration/errors/IntegrationError';
import { getApiInstances } from '../integration/providers/config/axiosInstances';
import winston from 'winston';
import { DailyError } from './errors/DailyError';
import DatabaseError from '../../shared/errors/DatabaseError';

const Album = z.object({
    position: z.string().transform((val) => Number(val)),
    release_name: z.string(),
    artist_name: z.string(),
    release_date: z.string().transform((val) => new Date(val)),
    release_type: z.string(),
    primary_genres: z.string().transform((val) => val.split(',').map((v) => v.trim())),
    descriptors: z.string().transform((val) => val.split(',').map((v) => v.trim())),
    avg_rating: z.string().transform((val) => Number(val)),
});

type AlbumType = z.infer<typeof Album>[];

type NormalizedDailyAlbum = {
    artists: ArtistCreateInputWithoutMbid[];
    normalizedArtist: string;
    descriptors: string[];
    primary_genres: string[];
    name: string;
    normalizedName: string;
    position: number;
    avg_rating: number;
    release_date: Date;
};

export class DailyAlbumService {
    constructor(
        private dailyAlbumRepo: DailyAlbumRepository,
        private albumRepo: AlbumRepository,
        private integrationService: IntegrationService,
        private logger: winston.Logger
    ) {}

    getDailyAlbum = async () => {
        const dailyAlbum = await this.dailyAlbumRepo.getDailyAlbum();

        if (!dailyAlbum) {
            throw new DailyError(404, `It was not found a daily album from ${new Date()}`);
        }

        const dailyAlbumTotalGuessesCount =
            await this.dailyAlbumRepo.getDailyAlbumTotalGuessesCount(dailyAlbum.albumId);

        const dailyAlbumNumber = await this.dailyAlbumRepo.getDailyAlbumNumber();

        if (!dailyAlbum.album.artists[0] || !dailyAlbum.album.artists[0].artist) {
            throw new ValidationError(404, `${dailyAlbum.album.name} has no artists`);
        }

        const lastfmInfo = await this.getLastfmInfo(
            dailyAlbum.album.normalizedName,
            dailyAlbum.album.artists[0].artist.normalizedName
        );

        return { dailyAlbum, dailyAlbumTotalGuessesCount, dailyAlbumNumber, url: lastfmInfo.url };
    };

    getRandomElectableAlbum = async () => {
        const electableAlbums = await this.getElectableDailyAlbums();

        const randomNumber = Math.floor(Math.random() * electableAlbums.count);
        const album = electableAlbums.electableAlbums.find((_, index) => index === randomNumber);
        if (!album) {
            throw new DailyError(
                404,
                `Electable album was not found. Random Factor: ${randomNumber}`
            );
        }
        return album;
    };

    getUserDailyAlbumStatistics = async (userId: string, dailyAlbumId: string) => {
        const userDailyAlbumStatistics = await this.dailyAlbumRepo.getUserDailyAlbumStatistics(
            userId,
            dailyAlbumId
        );

        const totalGuesses = userDailyAlbumStatistics?.userTries.length;

        return { userDailyAlbumStatistics, totalGuesses };
    };

    getUserDailyAlbumOverallStatistics = async (userId: string) => {
        const statistics = await this.dailyAlbumRepo.getUserDailyAlbumOverallStatistics(userId);
        if (!statistics) {
            return {
                userId,
                totalGuessed: 0,
                correctlyGuessed: 0,
                meanToGuess: 0,
                numberOfFirstGuesses: 0,
                currentStreak: 0,
                maxStreak: 0,
            };
        }
        return statistics;
    };

    findPossibleAlbums = async (attempt: string) => {
        const possibleAlbums = await this.findPossibleAlbumsByTitle(attempt);
        const possibleArtists = await this.findPossibleAlbumsByArtist(attempt);

        return [...possibleAlbums, ...possibleArtists];
    };

    findPossibleAlbumsByTitle = async (title: string) => {
        const albums = (await this.albumRepo.getByTitle(title)).filter(
            (album) => !!album.rymRanking && !!album.rymRating && !!album.descriptors
        );

        const albumsIds = await Promise.all(
            albums.map((album) => this.dailyAlbumRepo.findAlbumInPool(album.id))
        );

        const formattedAlbumsIds = albumsIds
            .filter((album) => !!album)
            .map((album) => album.albumId);

        const possibleAlbums = albums.filter((album) => formattedAlbumsIds.includes(album.id));

        return possibleAlbums;
    };

    findPossibleAlbumsByArtist = async (artist: string) => {
        const albums = (await this.albumRepo.getByArtist(artist)).filter(
            (album) => !!album.rymRanking && !!album.rymRating && !!album.descriptors
        );

        const albumsIds = await Promise.all(
            albums.map((album) => this.dailyAlbumRepo.findAlbumInPool(album.id))
        );

        const formattedAlbumsIds = albumsIds
            .filter((album) => !!album)
            .map((album) => album.albumId);

        const possibleAlbums = albums.filter((album) => formattedAlbumsIds.includes(album.id));

        return possibleAlbums;
    };

    setDailyAlbum = async (albumId: string) => {
        const album = await this.albumRepo.get(albumId);
        if (!album) {
            throw new DatabaseError(404, `Album with id "${albumId}" was not found`);
        }

        if (!album.artists[0] || !album.artists[0].artist) {
            throw new ValidationError(404, `${album.name} has no artists`);
        }

        const lastfmInfo = await this.getLastfmInfo(
            album.normalizedName,
            album.artists[0].artist.normalizedName
        );

        const lastDailyAlbum = await this.dailyAlbumRepo.getLastTenDailyAlbums();
        const lastDate =
            lastDailyAlbum[0]?.date || new Date(new Date().setDate(new Date().getDate() - 1));
        const year = lastDate.getUTCFullYear();
        const month = String(lastDate.getUTCMonth() + 1).padStart(2, '0');
        const date = String(lastDate.getUTCDate() + 1).padStart(2, '0');

        const tomorrow = `${year}-${month}-${date}T00:00:00.000Z`;

        const dailyAlbum = await this.dailyAlbumRepo.addDailyAlbum(albumId, tomorrow, {
            lastfmListeners: lastfmInfo.listeners,
            lastfmPlaycount: lastfmInfo.playcount,
        });

        await this.dailyAlbumRepo.unelectableAlbumInPool(album.id);

        return { album, dailyAlbum, tomorrow };
    };

    saveAlbumsAndAddToPool = async () => {
        const albums = await this.normalizeAlbums();

        let totalProcessed = 0;
        let created = 0;
        let updated = 0;
        let failed = 0;

        for (const album of albums) {
            const result = await this.processAlbum(album);
            totalProcessed++;

            if (result.failed) {
                failed++;
            }

            if (!result.failed && result.created) {
                created++;
            }

            if (!result.failed && !result.created) {
                updated++;
            }
        }

        return { totalProcessed, created, updated, failed };
    };

    addDailyAlbumTry = async (userId: string, guessedAlbumId: string) => {
        const { dailyAlbum } = await this.getDailyAlbum();

        const userTry = await this.dailyAlbumRepo.addDailyAlbumTry(
            userId,
            dailyAlbum.albumId,
            guessedAlbumId
        );

        if (!userTry) {
            throw new DatabaseError(500, 'It was not possible to register user try');
        }

        return userTry;
    };

    updateUserDailyAlbumOverallStatistics = async (
        userId: string,
        tries: number,
        isFinished: boolean = false
    ) => {
        const userDailyAlbumOverallStatistics =
            await this.dailyAlbumRepo.updateUserDailyAlbumOverallStatistics(
                userId,
                tries,
                isFinished
            );

        if (!userDailyAlbumOverallStatistics) {
            throw new DatabaseError(
                500,
                'It was not possible to update user daily album overall statistics'
            );
        }

        return userDailyAlbumOverallStatistics;
    };

    checkIfUserGuessedYesterdaysAlbum = async (userId: string) => {
        const yesterdaysAlbum = await this.dailyAlbumRepo.getYesterdaysAlbum();
        if (!yesterdaysAlbum) {
            throw new DailyError(404, 'It was not found a daily album from yesterday');
        }

        const userStatistics = await this.dailyAlbumRepo.getUserDailyAlbumStatistics(
            userId,
            yesterdaysAlbum.albumId
        );

        if (!userStatistics || userStatistics.status === 'UNFINISHED') {
            return false;
        }

        return true;
    };

    resetUserStreak = async (userId: string) => {
        return await this.dailyAlbumRepo.resetStreak(userId);
    };

    private getElectableDailyAlbums = async () => {
        const electableAlbums = await this.dailyAlbumRepo.getElectableDailyAlbums();
        if (!electableAlbums || electableAlbums.length === 0) {
            throw new DailyError(404, 'There are no more electable daily albums');
        }

        const electableDailyAlbumsCount = electableAlbums.length;

        if (electableDailyAlbumsCount < 10) {
            this.logger.warn(`There are only ${electableAlbums.length} available`);
        }

        return { electableAlbums, count: electableDailyAlbumsCount };
    };

    private processAlbum = async (album: NormalizedDailyAlbum) => {
        try {
            const dbAlbum = await this.albumRepo.getByTitleAndArtist(
                album.normalizedName,
                album.normalizedArtist
            );

            const isAlbumInPool = dbAlbum
                ? await this.dailyAlbumRepo.findAlbumInPool(dbAlbum.id)
                : false;

            const albumToSave = await this.saveAlbum(album);

            if (!albumToSave.rymRanking || !albumToSave.rymRating) {
                await this.includeRymData(albumToSave.id, album);
            }

            if (!isAlbumInPool) {
                await this.addAlbumToPool(albumToSave.id);
            }

            return { created: dbAlbum ? false : true };
        } catch (err) {
            console.log(`Failed to process album "${album.name}":`, err);
            return { failed: true };
        }
    };

    private saveAlbum = async (album: NormalizedDailyAlbum) => {
        const { formattedAlbum, genres, tracks } = await this.formatAlbum(album);

        return await this.albumRepo.upsertDailyAlbum(formattedAlbum, genres, album.artists, tracks);
    };

    private includeRymData = async (albumId: string | undefined, album: NormalizedDailyAlbum) => {
        if (!albumId) {
            throw new ValidationError(404, 'Album has no id');
        }

        return await this.albumRepo.includeRYMDataInAlbum(albumId, {
            position: album.position,
            avg_rating: album.avg_rating,
            descriptors: album.descriptors,
        });
    };

    private addAlbumToPool = async (albumId: string | undefined) => {
        if (!albumId) {
            throw new ValidationError(404, 'Album has no id');
        }
        return await this.dailyAlbumRepo.addAlbumToPool(albumId);
    };

    private formatAlbum = async (album: NormalizedDailyAlbum) => {
        if (!album.artists[0]) {
            throw new ValidationError(404, `${album.name} has no artists`);
        }

        const lastfmAxiosInstance = await this.getLastfmAxiosInstace();

        const lastfmInfo = await this.integrationService.fetchInfoWithAlbumData(
            album.normalizedName,
            album.artists[0].normalizedName,
            lastfmAxiosInstance
        );

        if (!lastfmInfo) {
            throw new IntegrationError(404, 'Album not found on lastfm');
        }

        const cover_url = this.integrationService.getCoverUrl(lastfmInfo);
        const year = String(album.release_date.getFullYear());
        if (!year) {
            this.logger.warn(new ValidationError(404, `Album "${album.name}" has no year`));
        }

        const formattedAlbum = {
            name: album.name,
            normalizedName: album.normalizedName,
            normalizedArtist: album.normalizedArtist,
            mbid: lastfmInfo.mbid,
            cover_url,
            year,
        };

        const genres = album.primary_genres.map((genre) => {
            return { name: genre };
        });

        const tracks = Array.isArray(lastfmInfo.tracks.track)
            ? lastfmInfo.tracks.track.map((track) => {
                  return {
                      name: track.name,
                      normalizedName: normalizeTrackName(track.name),
                  };
              })
            : [
                  {
                      name: lastfmInfo.tracks.track.name,
                      normalizedName: normalizeTrackName(lastfmInfo.tracks.track.name),
                  },
              ];

        return { formattedAlbum, genres, tracks };
    };

    private parseCsv = async (csv: string) => {
        const results = Papa.parse<AlbumType>(csv, {
            header: true,
            preview: 365,
            skipEmptyLines: true,
        });

        return results;
    };

    private checkFields = async () => {
        const filePromise = await fs.readFile('src/modules/dailyAlbum/assets/rym_clean1.csv');
        const textFile = filePromise.toString('utf-8');

        const albums = await this.parseCsv(textFile);
        const parsedAlbums = albums.data
            .map((album) => Album.parse(album))
            .filter((album) => album.release_type === 'album');

        return parsedAlbums;
    };

    private normalizeAlbums = async (): Promise<NormalizedDailyAlbum[]> => {
        const albums = await this.checkFields();
        const normalizedAlbums = albums.map((album) => {
            const artists = album.artist_name
                .split(
                    // eslint-disable-next-line max-len
                    /\/|&|\u0026|\u214B|\u06E5|\u1F672|\u1F673|\u1F674|\u1F675|\uFE60|\uFE06|\uFF06|🙴|🙵/g
                )
                .map((artist) => artist.trim());
            const formattedArtists: ArtistCreateInputWithoutMbid[] = artists.map((artist) => {
                return {
                    name: artist,
                    normalizedName: normalizeArtistName(artist),
                    mbid: null,
                };
            });
            return {
                artists: formattedArtists,
                normalizedArtist: album.artist_name
                    .split(
                        // eslint-disable-next-line max-len
                        /\/|&|\u0026|\u214B|\u06E5|\u1F672|\u1F673|\u1F674|\u1F675|\uFE60|\uFE06|\uFF06|🙴|🙵/g
                    )
                    .map((artist) => normalizeArtistName(artist))
                    .join(', '),
                descriptors: album.descriptors.map((descriptor) => normalizeTagName(descriptor)),
                primary_genres: album.primary_genres.map((genre) => normalizeTagName(genre)),
                name: album.release_name,
                normalizedName: normalizeAlbumName(album.release_name),
                position: album.position,
                avg_rating: album.avg_rating,
                release_date: album.release_date,
            };
        });

        return normalizedAlbums;
    };

    private getLastfmAxiosInstace = async () => {
        const axiosInstances = await getApiInstances();
        return axiosInstances.lastfmAxios;
    };

    private getLastfmInfo = async (title: string, artist: string) => {
        const lastfmAxiosInstace = await this.getLastfmAxiosInstace();

        const lastfmInfo = await this.integrationService.fetchInfoWithAlbumData(
            title,
            artist,
            lastfmAxiosInstace
        );
        if (!lastfmInfo) {
            await this.integrationService.saveFailedAlbumSync(
                {
                    name: title,
                    normalizedAlbum: title,
                    artist: artist,
                    mbid: null,
                },
                '',
                'SERVER',
                this.logger,
                `It was not possible to fetch info from album "${title} - ${artist}" in lastfm`
            );
            throw new ValidationError(404, `It was not possible to fetch "${title}" data`);
        }

        return lastfmInfo;
    };
}

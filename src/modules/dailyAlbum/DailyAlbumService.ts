import { DailyAlbumRepository } from './DailyAlbumRepository';
import Papa from 'papaparse';
import fs from 'fs/promises';
import * as z from 'zod';
import {
    normalizeAlbumName,
    normalizeArtistName,
    normalizeTagName,
} from '../integration/utils/normalize';
import AlbumRepository, { ArtistCreateInputWithoutMbid } from '../album/AlbumRepository';
import IntegrationService from '../integration/IntegrationService';
import ValidationError from '../../shared/errors/ValidationError';
import { DailyError } from './errors/DailyError';
import DatabaseError from '../../shared/errors/DatabaseError';
import { compareArray, compareRanking, compareRating, compareYear } from './utils/compareFunctions';
import { musicBrainzWrapper } from '../integration/utils/MusicBrainzWrapper';
import { logger } from '../../config/logger/logger';
import { PossibleAlbums } from './types/possibleAlbums';
import { CoverUrlEnum } from '../../generated/prisma/enums';

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
    hasCoverUrl: CoverUrlEnum;
};

export class DailyAlbumService {
    private musicBrainz = musicBrainzWrapper;
    constructor(
        private dailyAlbumRepo: DailyAlbumRepository,
        private albumRepo: AlbumRepository,
        private integrationService: IntegrationService
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

        return { dailyAlbum, dailyAlbumTotalGuessesCount, dailyAlbumNumber };
    };

    getRandomElectableAlbum = async () => {
        const { electableAlbums, count } = await this.getElectableDailyAlbums();

        const randomNumber = Math.floor(Math.random() * count);
        const album = electableAlbums.find((_, index) => index === randomNumber);
        if (!album) {
            throw new DailyError(
                404,
                `Electable album was not found. Random Factor: ${randomNumber}`
            );
        }
        return album;
    };

    getUserDailyAlbumStatistics = async (userId: string, date?: string) => {
        const dailyAlbum = await this.dailyAlbumRepo.getDailyAlbum(date);
        if (!dailyAlbum) {
            throw new DailyError(404, 'Daily album not found for specified date');
        }

        const userDailyAlbumStatistics = await this.dailyAlbumRepo.getUserDailyAlbumStatistics(
            userId,
            dailyAlbum.albumId
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
        const possibleYears = await this.findPossibleAlbumsByYear(attempt);

        return [...possibleAlbums, ...possibleArtists, ...possibleYears];
    };

    findPossibleAlbumsByTitle = async (title: string): Promise<PossibleAlbums[]> => {
        const albums = (await this.albumRepo.getByTitle(title)).filter(
            (album) => !!album.rymRanking && !!album.rymRating && !!album.descriptors
        );

        const albumsInPool = await Promise.all(
            albums.map((album) => this.dailyAlbumRepo.findAlbumInPool(album.id))
        );

        const albumsIds = albumsInPool.filter((album) => !!album).map((album) => album.albumId);

        const possibleAlbums = albums.filter((album) => albumsIds.includes(album.id));
        const dailyAlbum = await this.dailyAlbumRepo.getDailyAlbum();
        if (!dailyAlbum) {
            throw new DailyError(404, 'Daily album not set');
        }
        const possibleAlbumsWithTries = await Promise.all(
            possibleAlbums.map(async (album) => {
                return {
                    ...album,
                    count: await this.albumRepo.getDailyAlbumTries(album.id, dailyAlbum?.albumId),
                };
            })
        );

        return possibleAlbumsWithTries;
    };

    findPossibleAlbumsByArtist = async (artist: string) => {
        const albums = (await this.albumRepo.getByArtist(artist)).filter(
            (album) => !!album.rymRanking && !!album.rymRating && !!album.descriptors
        );

        const albumsInPool = await Promise.all(
            albums.map((album) => this.dailyAlbumRepo.findAlbumInPool(album.id))
        );

        const albumsIds = albumsInPool.filter((album) => !!album).map((album) => album.albumId);

        const possibleAlbums = albums.filter((album) => albumsIds.includes(album.id));
        const dailyAlbum = await this.dailyAlbumRepo.getDailyAlbum();
        if (!dailyAlbum) {
            throw new DailyError(404, 'Daily album not set');
        }
        const possibleAlbumsWithTries = await Promise.all(
            possibleAlbums.map(async (album) => {
                return {
                    ...album,
                    count: await this.albumRepo.getDailyAlbumTries(album.id, dailyAlbum?.albumId),
                };
            })
        );

        return possibleAlbumsWithTries;
    };

    findPossibleAlbumsByYear = async (year: string) => {
        const albums = (await this.albumRepo.getByYear(year)).filter(
            (album) => !!album.rymRanking && !!album.rymRating && !!album.descriptors
        );

        const albumsIds = await Promise.all(
            albums.map((album) => this.dailyAlbumRepo.findAlbumInPool(album.id))
        );

        const formattedAlbumsIds = albumsIds
            .filter((album) => !!album)
            .map((album) => album.albumId);

        const possibleAlbums = albums.filter((album) => formattedAlbumsIds.includes(album.id));
        const dailyAlbum = await this.dailyAlbumRepo.getDailyAlbum();
        if (!dailyAlbum) {
            throw new DailyError(404, 'Daily album not set');
        }
        const possibleAlbumsWithTries = await Promise.all(
            possibleAlbums.map(async (album) => {
                return {
                    ...album,
                    count: await this.albumRepo.getDailyAlbumTries(album.id, dailyAlbum?.albumId),
                };
            })
        );

        return possibleAlbumsWithTries;
    };

    setDailyAlbum = async (albumId: string) => {
        const album = await this.albumRepo.get(albumId);
        if (!album || !album.mbid) {
            throw new DatabaseError(
                404,
                `Album with id "${albumId}" was not found or doesn't have mbid`
            );
        }

        const cover_url = await this.getCoverUrl(album.mbid);
        if (!cover_url) {
            throw new DailyError(
                404,
                `${album.name}:${album.artists[0]?.artist.name} has not a cover on CAA`
            );
        }

        if (!album.artists[0] || !album.artists[0].artist) {
            throw new DailyError(404, `${album.name} has no artists`);
        }

        const lastDailyAlbum = await this.dailyAlbumRepo.getLastTenDailyAlbums();
        const lastDate =
            lastDailyAlbum[0]?.date || new Date(new Date().setDate(new Date().getDate() - 1));

        const tomorrowDate = new Date(lastDate.setDate(lastDate.getDate() + 1));
        const year = tomorrowDate.getUTCFullYear();
        const month = String(tomorrowDate.getUTCMonth() + 1).padStart(2, '0');
        const date = String(tomorrowDate.getUTCDate()).padStart(2, '0');

        const tomorrow = `${year}-${month}-${date}T00:00:00.000Z`;

        const dailyAlbum = await this.dailyAlbumRepo.addDailyAlbum(albumId, tomorrow);

        await this.dailyAlbumRepo.unelectableAlbumInPool(album.id);

        return { album: { ...album, cover_url }, dailyAlbum, tomorrow };
    };

    saveAlbumsAndAddToPool = async () => {
        const albums = await this.normalizeAlbums();

        let totalProcessed = 0;
        let created = 0;
        let updated = 0;
        let unchanged = 0;
        let failed = 0;

        for (const album of albums) {
            console.log('processing album:', album.name);
            const result = await this.processAlbum(album);
            totalProcessed++;

            if (result.unchanged) {
                unchanged++;
            }

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

        return { totalProcessed, created, updated, unchanged, failed };
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
            // throw new DailyError(404, 'It was not found a daily album from yesterday');
            return false;
        }

        const userStatistics = await this.dailyAlbumRepo.getUserDailyAlbumStatistics(
            userId,
            yesterdaysAlbum.albumId
        );

        if (userStatistics?.status === 'UNFINISHED') {
            return false;
        }

        return true;
    };

    resetUserStreak = async (userId: string) => {
        return await this.dailyAlbumRepo.resetStreak(userId);
    };

    buildGuessRow = async (guessedId: string) => {
        const dailyAlbumModel = await this.getDailyAlbum();
        const guessed = await this.albumRepo.get(guessedId);
        const daily = dailyAlbumModel.dailyAlbum;

        if (!daily || !guessed || !guessed.mbid) {
            throw new DailyError(404, 'Daily album or guessed album not found');
        }
        const cover_url = await this.getCoverUrl(guessed.mbid);

        const targetArtistIds = daily.album.artists.map((a) => a.artist.id).filter((_, i) => i < 3);
        const targetGenreIds = daily.album.genres.map((g) => g.genre.id).filter((_, i) => i < 3);
        const guessedArtistIds = guessed.artists.map((a) => a.artist.id).filter((_, i) => i < 3);
        const guessedGenreIds = guessed.genres.map((g) => g.genre.id).filter((_, i) => i < 3);
        const targetDescriptors = daily.album.descriptors.filter((_, i) => i < 3);
        const guessedDescriptors = guessed.descriptors.filter((_, i) => i < 3);

        return {
            album: guessed,
            cover_url,
            year: compareYear(guessed.year, daily.album.year),
            artists: compareArray(guessedArtistIds, targetArtistIds),
            genres: {
                status: compareArray(guessedGenreIds, targetGenreIds).status,
                values: guessed.genres.map((genre) => genre.genre.name),
            },
            rymRating: compareRating(guessed.rymRating, daily.album.rymRating),
            rymRanking: compareRanking(guessed.rymRanking, daily.album.rymRanking),
            descriptors: {
                status: compareArray(guessedDescriptors, targetDescriptors).status,
                values: guessed.descriptors,
            },
        };
    };

    getCoverUrl = async (mbid: string) => {
        return await this.integrationService.getCoverUrl(mbid);
    };

    private getElectableDailyAlbums = async () => {
        const electableAlbums = await this.dailyAlbumRepo.getElectableDailyAlbums();
        if (!electableAlbums || electableAlbums.length === 0) {
            throw new DailyError(404, 'There are no more electable daily albums');
        }

        const electableDailyAlbumsCount = electableAlbums.length;

        if (electableDailyAlbumsCount < 10) {
            logger.warn(`There are only ${electableAlbums.length} available`);
        }

        return { electableAlbums, count: electableDailyAlbumsCount };
    };

    private processAlbum = async (album: NormalizedDailyAlbum) => {
        try {
            const dbAlbum = await this.albumRepo.getByTitleAndArtist(
                album.normalizedName,
                album.normalizedArtist
            );

            if (
                dbAlbum?.descriptors &&
                dbAlbum.rymRanking &&
                dbAlbum.rymRating &&
                dbAlbum.hasCoverUrl !== 'FALSE'
            ) {
                return { unchanged: true };
            }

            const isAlbumInPool = await this.isAlbumInPool(dbAlbum?.id);

            const albumToSave = await this.saveAlbum(album);

            if (!albumToSave.rymRanking || !albumToSave.rymRating) {
                await this.includeRymData(albumToSave.id, album);
            }

            if (!isAlbumInPool) {
                await this.addAlbumToPool(albumToSave.id);
            }

            return { created: dbAlbum ? false : true };
        } catch (err) {
            await this.integrationService.saveFailedAlbumSync(
                {
                    name: album.name,
                    artist: album.artists[0]?.name || '',
                    mbid: null,
                    normalizedAlbum:
                        normalizeAlbumName(album.name) +
                        ' - ' +
                        normalizeArtistName(album.artists[0]?.name),
                },
                '',
                'Daily',
                logger,
                err
            );
            console.log(`Failed to process album "${album.name}":`, (err as Error).message);
            return { failed: true };
        }
    };

    private isAlbumInPool = async (albumId: string | undefined): Promise<boolean> => {
        if (await this.dailyAlbumRepo.findAlbumInPool(albumId ?? '')) {
            return true;
        }
        return false;
    };

    private saveAlbum = async (album: NormalizedDailyAlbum) => {
        const formattedAlbumModel = await this.formatAlbum(album);
        if (!formattedAlbumModel) {
            throw new DailyError(404, 'Cover image not found');
        }
        const { formattedAlbum, genres, tracks } = formattedAlbumModel;

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
            throw new DailyError(404, `${album.name} has no artists`);
        }

        const musicBrainzAlbumModel = await this.musicBrainz.fetchAlbum(
            undefined,
            album.name,
            album.artists[0].name
        );
        if (!musicBrainzAlbumModel || !musicBrainzAlbumModel.musicBrainzAlbum) {
            throw new DailyError(404, `${album.name} not found on MusicBrainz`);
        }

        const { musicBrainzAlbum, tracks } = musicBrainzAlbumModel;
        let { hasCoverUrl, mbid } = musicBrainzAlbumModel;
        if (!hasCoverUrl || hasCoverUrl === 'try release-group') {
            hasCoverUrl = await this.integrationService.hasCoverUrl(
                musicBrainzAlbum.releases?.[0]?.id || musicBrainzAlbum.id
            );
            mbid = musicBrainzAlbum.releases?.[0]?.id || musicBrainzAlbum.id;

            if (!hasCoverUrl) {
                hasCoverUrl = await this.integrationService.hasCoverUrl(
                    musicBrainzAlbum?.['release-group']?.id
                );
                mbid = musicBrainzAlbum?.['release-group']?.id || mbid;
                if (!hasCoverUrl) {
                    throw new DailyError(404, `${album.name} has no cover url`);
                }
            }
        }
        const coverType = {
            'release-group': 'RELEASE_GROUP',
            release: 'RELEASE',
        } as const;

        const year = String(album.release_date.getFullYear());

        const formattedAlbum = {
            name: album.name,
            normalizedName: album.normalizedName,
            normalizedArtist: album.normalizedArtist,
            mbid: mbid || musicBrainzAlbum.releases?.[0]?.id || musicBrainzAlbum.id,
            year,
            hasCoverUrl: coverType[hasCoverUrl],
        };

        const genres = album.primary_genres.map((genre) => {
            return { name: genre };
        });

        const normalizedTracks =
            tracks && tracks.length > 0
                ? tracks
                : await this.musicBrainz.fetchTracks(
                      musicBrainzAlbum.releases?.[0]?.id || musicBrainzAlbum.id
                  );

        return { formattedAlbum, genres, tracks: normalizedTracks };
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
                hasCoverUrl: 'FALSE' as const,
            };
        });

        return normalizedAlbums;
    };
}

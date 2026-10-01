import winston from 'winston';
import ValidationError from '../../shared/errors/ValidationError';
import { sendMail } from '../../shared/utils/sendMail';
import AuthService from '../auth/AuthService';
import AuthError from '../auth/errors/AuthError';
import COOKIE_OPTIONS from '../auth/utils/COOKIE_OPTIONS';
import { DailyAlbumService } from './DailyAlbumService';
import type { Request, Response } from 'express';

export class DailyAlbumController {
    constructor(
        private dailyAlbumService: DailyAlbumService,
        private authService: AuthService,
        private logger: winston.Logger
    ) {}

    getDailyAlbum = async (req: Request, res: Response) => {
        const userId = req.userId;

        const { dailyAlbum, dailyAlbumTotalGuessesCount, dailyAlbumNumber, url } =
            await this.dailyAlbumService.getDailyAlbum();

        const json = {
            status: 'success',
            message: 'Fetched daily album',
            dailyAlbum,
            dailyAlbumNumber,
            dailyAlbumUrl: url,
            dailyAlbumTotalGuessesCount,
        };

        if (!userId) {
            const guest = await this.authService.createGuest();

            return res
                .status(200)
                .cookie('token', guest.token, COOKIE_OPTIONS(1000 * 60 * 65))
                .cookie('refresh', guest.refresh, COOKIE_OPTIONS(1000 * 60 * 60 * 24 * 30))
                .json(json);
        }

        return res.status(200).json(json);
    };

    getUserDailyAlbumStatistics = async (req: Request, res: Response) => {
        const albumId = req.query.albumId;
        const userId = req.userId;

        if (!userId) {
            throw new AuthError(401, 'User is not authenticated');
        }

        if (!albumId || typeof albumId !== 'string') {
            throw new ValidationError(400, 'AlbumId was not provided or has an invalid format');
        }

        const { userDailyAlbumStatistics, totalGuesses } =
            await this.dailyAlbumService.getUserDailyAlbumStatistics(userId, albumId);

        if (!(await this.dailyAlbumService.checkIfUserGuessedYesterdaysAlbum(userId))) {
            if (!userDailyAlbumStatistics) {
                await this.dailyAlbumService.resetUserStreak(userId);
                this.logger.info({
                    event: 'Reset daily album streak',
                    user: userId,
                });
            }
        }

        return res.status(200).json({
            status: 'success',
            message: 'Returned daily album statistics',
            userDailyAlbumStatistics,
            totalGuesses,
        });
    };

    getUserDailyAlbumOverallStatistics = async (req: Request, res: Response) => {
        const userId = req.userId;

        if (!userId) {
            throw new AuthError(401, 'User is not authenticated');
        }

        const statistics = await this.dailyAlbumService.getUserDailyAlbumOverallStatistics(userId);

        return res.status(200).json({
            status: 'success',
            message: 'Returned daily album overall statistics',
            statistics,
        });
    };

    findPossibleAlbums = async (req: Request, res: Response) => {
        const attempt = req.body.attempt;
        if (!attempt || typeof attempt !== 'string') {
            throw new ValidationError(400, 'Attempt was not provided os has an invalid format');
        }

        const possibleAlbums = await this.dailyAlbumService.findPossibleAlbums(attempt);

        return res.status(200).json({
            status: 'success',
            message: 'Returned possible albums',
            count: possibleAlbums.length,
            possibleAlbums,
        });
    };

    addDailyAlbumTry = async (req: Request, res: Response) => {
        const guessedAlbumId = req.body.guessedAlbumId;
        const userId = req.userId;

        if (!userId) {
            throw new AuthError(401, 'User not logged in');
        }

        if (!guessedAlbumId || typeof guessedAlbumId !== 'string') {
            throw new ValidationError(
                400,
                'GuessedAlbumId was not provided or has an invalid format'
            );
        }

        const userTry = await this.dailyAlbumService.addDailyAlbumTry(userId, guessedAlbumId);

        return res.status(200).json({
            status: 'success',
            message: 'User try registered',
            userTry,
        });
    };

    updateUserDailyAlbumOverallStatistics = async (req: Request, res: Response) => {
        const userId = req.userId;
        const tries = req.body.tries;
        const isFinished = req.body.isFinished;

        if (!tries) {
            throw new ValidationError(400, 'Tries param was not provided');
        }

        if (!userId) {
            throw new AuthError(401, 'User not logged in');
        }

        if (!isFinished) {
            throw new ValidationError(400, 'GuessedAlbumId was not provided');
        }

        const userDailyAlbumOverallStatistics =
            await this.dailyAlbumService.updateUserDailyAlbumOverallStatistics(
                userId,
                Number(tries),
                Boolean(isFinished)
            );

        return res.status(200).json({
            status: 'success',
            message: 'User daily album updated successfully',
            userDailyAlbumOverallStatistics,
        });
    };

    saveAlbumsAndAddToPool = async (req: Request, res: Response) => {
        const { totalProcessed, created, failed, updated } =
            await this.dailyAlbumService.saveAlbumsAndAddToPool();
        return res.status(200).json({
            status: 'success',
            message: 'Saved albums and added them to Album Pool',
            summary: {
                totalProcessed,
                created,
                updated,
                failed,
            },
        });
    };

    defineDailyAlbumForDayAfterTomorrow = async (req: Request, res: Response) => {
        const electableAlbum = await this.dailyAlbumService.getRandomElectableAlbum();

        const { album, dailyAlbum, tomorrow } = await this.dailyAlbumService.setDailyAlbum(
            electableAlbum.albumId
        );

        const artists = album.artists.map((artist) => artist.artist.normalizedName).join(', ');
        const genres = album.genres.map((genre) => genre.genre.name).join(', ');

        const dateObj = new Date(tomorrow);

        sendMail(
            'albumguessnr@gmail.com',

            `Daily album data from ${dateObj.toUTCString()}`,
            `
            <p>Id: ${album.id}</p>
            <p>title: ${album.normalizedName} (${album.name})</p>
            <p>Artists: ${artists}</p>
            <p>Genres: ${genres}</p>
            <p>Cover: ${album.cover_url}</p>
            <p>Descriptors: ${album.descriptors.join(', ')}</p>
            <p>Rym ranking: ${album.rymRanking?.toFixed(0)}</p>
            <p>Rym rating: ${album.rymRating?.toFixed(2)}</p>
            <p>Year: ${album.year}</p>
            <p>Listeners: ${dailyAlbum.lastfmListeners}</p>
            <p>Playcount: ${dailyAlbum.lastfmPlaycount}</p>
            `
        );

        return res.status(200).json({
            status: 'success',
            message: `Setted ${dateObj.toUTCString()} daily album`,
            dailyAlbum,
        });
    };
}

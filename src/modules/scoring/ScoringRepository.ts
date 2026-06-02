import type { PrismaClient } from '@prisma/client/extension';
import { prisma } from '../../config/prisma.js';
import { Prisma } from '../../generated/prisma/client.js';
import { getStartOfDay } from './utils/dateUtils.js';
import retryRequest from './utils/retryRequest.js';

interface GuessAttemptCategoryWithCategoryAndScore {
    category: 'ALBUM' | 'ARTIST' | 'GENRE' | 'YEAR' | 'TRACKLIST';
    score: number;
}

interface GuessedTracklist {
    trackId: string;
    isCorrect: boolean;
}

class ScoringRepository {
    constructor() {}

    findAlbum = async (albumId: string) => {
        return await prisma.album.findUnique({
            where: {
                id: albumId,
            },
        });
    };

    getTracksLength = async (albumId: string) => {
        return await prisma.track.aggregate({
            where: {
                albumId,
            },
            _count: {
                id: true,
            },
        });
    };

    makeGuess = async (
        userId: string,
        albumId: string,
        date: Date,
        totalScore: number,
        timeSpent: number,
        categories: Array<GuessAttemptCategoryWithCategoryAndScore>,
        guessedTracks: Array<GuessedTracklist>
    ) => {
        await prisma.$transaction(async (tx: PrismaClient) => {
            console.time('findBestScore');
            const previousScore = await this.findBestScore(userId, albumId, tx);
            console.timeEnd('findBestScore');

            if (!previousScore._max.totalScore || previousScore._max.totalScore < totalScore) {
                console.time('incrementUserTotalScore');
                await this.incrementUserTotalScore(
                    userId,
                    albumId,
                    date,
                    categories,
                    totalScore,
                    tx
                );
                console.timeEnd('incrementUserTotalScore');
                console.time('deletePreviousScore');
                await this.deletePreviousScore(userId, albumId, date, categories, tx);
                console.timeEnd('deletePreviousScore');
                console.time('addNewBestScore');
                await this.addNewBestScore(userId, albumId, date, categories, tx);
                console.timeEnd('addNewBestScore');
            }
        });

        this.makeGuessAttempt(
            userId,
            albumId,
            timeSpent,
            totalScore,
            categories,
            guessedTracks
        ).catch((e) => {
            if (e instanceof Prisma.PrismaClientKnownRequestError) {
                retryRequest(
                    () =>
                        this.makeGuessAttempt(
                            userId,
                            albumId,
                            timeSpent,
                            totalScore,
                            categories,
                            guessedTracks
                        ),
                    3
                );
            }
        });
    };

    findBestScore = async (userId: string, albumId: string, tx?: Prisma.TransactionClient) => {
        const client = tx || prisma;

        return await client.guessAttempt.aggregate({
            where: {
                userId,
                albumId,
            },
            _max: {
                totalScore: true,
            },
        });
    };

    deletePreviousScore = async (
        userId: string,
        albumId: string,
        date: Date,
        categories: Array<GuessAttemptCategoryWithCategoryAndScore>,
        tx?: Prisma.TransactionClient
    ) => {
        const client = tx || prisma;
        const startOfDay = getStartOfDay(date);

        return await client.userAlbumScores.deleteMany({
            where: {
                userId,
                albumId,
                date: startOfDay,
                gameMode: {
                    in: categories.map((c) => c.category),
                },
            },
        });
    };

    addNewBestScore = async (
        userId: string,
        albumId: string,
        date: Date,
        categories: Array<GuessAttemptCategoryWithCategoryAndScore>,
        tx?: Prisma.TransactionClient
    ) => {
        const client = tx || prisma;
        const startOfDay = getStartOfDay(date);

        return await client.userAlbumScores.createMany({
            data: categories.map((c) => ({
                userId,
                albumId,
                date: startOfDay,
                gameMode: c.category,
                bestScore: c.score,
            })),
        });
    };

    incrementUserTotalScore = async (
        userId: string,
        albumId: string,
        date: Date,
        categories: Array<GuessAttemptCategoryWithCategoryAndScore>,
        newScore: number,
        tx?: Prisma.TransactionClient
    ) => {
        const client = tx || prisma;
        const startOfDay = getStartOfDay(date);

        const oldBestScores = await client.userAlbumScores
            .findMany({
                where: {
                    userId,
                    albumId,
                    date: startOfDay,
                    gameMode: {
                        in: categories.map((c) => c.category),
                    },
                },
                select: {
                    bestScore: true,
                },
            })
            .then((res) => res.map((r) => r.bestScore));

        const oldBestScore = oldBestScores.reduce((acc, cur) => acc + cur, 0);

        return await client.userStats.update({
            where: {
                userId,
            },
            data: {
                totalScore: {
                    increment: newScore - oldBestScore,
                },
            },
        });
    };

    makeGuessAttempt = async (
        userId: string,
        albumId: string,
        timeSpent: number,
        totalScore: number,
        categories: Array<GuessAttemptCategoryWithCategoryAndScore>,
        guessedTracks: Array<GuessedTracklist>,
        tx?: Prisma.TransactionClient
    ) => {
        const client = tx || prisma;
        const rightAnswers =
            guessedTracks.length > 0 ? guessedTracks.filter((gt) => gt.isCorrect).length : -1;
        return await client.guessAttempt.create({
            data: {
                userId,
                albumId,
                timeSpent,
                totalScore,
                tracksHit: rightAnswers,
                categories: {
                    create: categories.map((c) => ({
                        category: c.category,
                        score: c.score,
                    })),
                },
                guessedTracks: {
                    create: guessedTracks?.map((gt) => ({
                        trackId: gt.trackId,
                        isCorrect: gt.isCorrect,
                    })),
                },
            },
        });
    };
}

export default ScoringRepository;

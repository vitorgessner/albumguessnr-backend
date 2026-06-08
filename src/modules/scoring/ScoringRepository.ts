import { prisma } from '../../config/prisma.js';
import { Prisma } from '../../generated/prisma/client.js';
import { getStartOfDay } from './utils/dateUtils.js';
import { CategoriesWithScore } from '../game/guess/types/CategoriesWithScore.js';

class ScoringRepository {
    constructor() {}
    handleBestScore = async (
        userId: string,
        albumId: string,
        date: Date,
        totalScore: number,
        categories: Array<CategoriesWithScore>,
        oldGlobalBestScore: number,
        tx?: Prisma.TransactionClient
    ) => {
        const client = tx || prisma;

        const upsertPromises = await this.upsertBestScores(
            categories,
            userId,
            albumId,
            date,
            client
        );

        await Promise.all([
            ...upsertPromises,
            this.incrementUserTotalScore(userId, totalScore, oldGlobalBestScore, client),
        ]);
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

    private upsertBestScores = async (
        categories: Array<CategoriesWithScore>,
        userId: string,
        albumId: string,
        date: Date,
        client: Prisma.TransactionClient
    ) => {
        const startOfDay = getStartOfDay(date);

        return categories.map((c) =>
            client.userAlbumScores.upsert({
                where: {
                    userId_albumId_gameMode_date: {
                        userId,
                        albumId,
                        date: startOfDay,
                        gameMode: c.category,
                    },
                },
                update: { bestScore: c.score },
                create: {
                    userId,
                    albumId,
                    date: startOfDay,
                    gameMode: c.category,
                    bestScore: c.score,
                },
                select: {
                    bestScore: true,
                },
            })
        );
    };

    // private deletePreviousBestScore = async (
    //     userId: string,
    //     albumId: string,
    //     date: Date,
    //     categories: Array<CategoriesWithScore>,
    //     tx?: Prisma.TransactionClient
    // ) => {
    //     const client = tx || prisma;
    //     const startOfDay = getStartOfDay(date);

    //     return await client.userAlbumScores.deleteMany({
    //         where: {
    //             userId,
    //             albumId,
    //             date: startOfDay,
    //             gameMode: {
    //                 in: categories.map((c) => c.category),
    //             },
    //         },
    //     });
    // };

    // private addNewBestScore = async (
    //     userId: string,
    //     albumId: string,
    //     date: Date,
    //     categories: Array<CategoriesWithScore>,
    //     tx?: Prisma.TransactionClient
    // ) => {
    //     const client = tx || prisma;
    //     const startOfDay = getStartOfDay(date);

    //     return await client.userAlbumScores.createMany({
    //         data: categories.map((c) => ({
    //             userId,
    //             albumId,
    //             date: startOfDay,
    //             gameMode: c.category,
    //             bestScore: c.score,
    //         })),
    //     });
    // };

    private incrementUserTotalScore = async (
        userId: string,
        newScore: number,
        oldGlobalBestScore: number,
        client: Prisma.TransactionClient
    ) => {
        const pointsToIncrement = newScore - oldGlobalBestScore;

        if (pointsToIncrement > 0) {
            return await client.userStats.update({
                where: { userId },
                data: {
                    totalScore: {
                        increment: pointsToIncrement,
                    },
                },
            });
        }

        return;
    };
}

export default ScoringRepository;

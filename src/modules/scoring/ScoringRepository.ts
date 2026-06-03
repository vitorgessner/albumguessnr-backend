import type { PrismaClient } from '@prisma/client/extension';
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
        categories: Array<CategoriesWithScore>
    ) => {
        await prisma.$transaction(async (tx: PrismaClient) => {
            const previousScore = await this.findBestScore(userId, albumId, tx);

            if (!previousScore._max.totalScore || previousScore._max.totalScore < totalScore) {
                await this.incrementUserTotalScore(
                    userId,
                    albumId,
                    date,
                    categories,
                    totalScore,
                    tx
                );
                await this.deletePreviousBestScore(userId, albumId, date, categories, tx);
                await this.addNewBestScore(userId, albumId, date, categories, tx);
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

    private deletePreviousBestScore = async (
        userId: string,
        albumId: string,
        date: Date,
        categories: Array<CategoriesWithScore>,
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

    private addNewBestScore = async (
        userId: string,
        albumId: string,
        date: Date,
        categories: Array<CategoriesWithScore>,
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

    private incrementUserTotalScore = async (
        userId: string,
        albumId: string,
        date: Date,
        categories: Array<CategoriesWithScore>,
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
}

export default ScoringRepository;

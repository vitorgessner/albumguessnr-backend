import { prisma } from '../../../config/prisma.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { CategoriesWithScore } from './types/CategoriesWithScore.js';
import { GuessedTrack } from './types/GuessedTrack.js';

class GuessRepository {
    getTimesGuessed = async (userId: string, albumId: string) => {
        return await prisma.userAlbumStats.findUnique({
            where: {
                userId_albumId: {
                    userId,
                    albumId,
                },
            },
            select: {
                timesGuessed: true,
            },
        });
    };

    getLastTenPlayers = async () => {
        return await prisma.guessAttempt.findMany({
            distinct: 'userId',
            orderBy: {
                date: 'desc',
            },
            take: 8,
            include: {
                user: {
                    select: {
                        profile: {
                            select: {
                                avatar_url: true,
                                username: true,
                            },
                        },
                    },
                },
            },
        });
    };

    upsertUserAlbumStats = async (
        userId: string,
        albumId: string,
        tx?: Prisma.TransactionClient
    ) => {
        const client = tx || prisma;
        return await client.userAlbumStats.upsert({
            where: {
                userId_albumId: {
                    userId,
                    albumId,
                },
            },
            create: {
                lastTimeGuessed: new Date(),
                timesGuessed: 1,
                userId,
                albumId,
            },
            update: {
                lastTimeGuessed: new Date(),
                timesGuessed: {
                    increment: 1,
                },
                userId,
                albumId,
            },
        });
    };

    makeGuessAttempt = async (
        userId: string,
        albumId: string,
        timeSpent: number,
        totalScore: number,
        categories: Array<CategoriesWithScore>,
        guessedTracks: Array<GuessedTrack>,
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

export default GuessRepository;

import { prisma } from '../../config/prisma';
import { Prisma } from '../../generated/prisma/client';
import { isToday } from '../../shared/utils/isToday';

export class DailyAlbumRepository {
    getDailyAlbum = async () => {
        const newestDailyAlbums = await prisma.dailyAlbum.findMany({
            take: 10,
            orderBy: {
                date: 'desc',
            },
            include: {
                album: {
                    include: {
                        artists: {
                            include: {
                                artist: true,
                            },
                        },
                        genres: {
                            include: {
                                genre: true,
                            },
                        },
                    },
                },
            },
        });

        const dailyAlbum = newestDailyAlbums.find((album) => isToday(album.date));
        return dailyAlbum;
    };

    getLastTenDailyAlbums = async () => {
        return await prisma.dailyAlbum.findMany({
            take: 10,
            orderBy: {
                date: 'desc',
            },
            include: {
                album: {
                    include: {
                        artists: {
                            include: {
                                artist: true,
                            },
                        },
                        genres: {
                            include: {
                                genre: true,
                            },
                        },
                    },
                },
            },
        });
    };

    getDailyAlbumNumber = async () => {
        return await prisma.dailyAlbum.count();
    };

    getElectableDailyAlbums = async () => {
        return await prisma.albumPools.findMany({
            where: {
                electable: true,
            },
        });
    };

    getUserDailyAlbumOverallStatistics = async (userId: string) => {
        return await prisma.userDailyAlbumOverallStatistics.findUnique({
            where: {
                userId,
            },
        });
    };

    getDailyAlbumTotalGuessesCount = async (dailyAlbumId: string) => {
        return await prisma.userDailyAlbum.count({
            where: {
                dailyAlbumId,
                status: 'FINISHED',
            },
        });
    };

    getUserDailyAlbumStatistics = async (userId: string, dailyAlbumId: string) => {
        return await prisma.userDailyAlbum.findUnique({
            where: {
                userId_dailyAlbumId: {
                    userId,
                    dailyAlbumId,
                },
            },
            include: {
                userTries: {
                    orderBy: {
                        nthTry: 'desc',
                    },
                },
            },
        });
    };

    getLastPlayerToGuessPosition = async (dailyAlbumId: string) => {
        const order = await prisma.userDailyAlbum.findMany({
            where: {
                status: 'FINISHED',
                dailyAlbumId,
            },
            include: {
                userTries: {
                    where: {
                        albumGuessId: dailyAlbumId,
                    },
                    orderBy: {
                        timestamp: 'desc',
                    },
                    take: 1,
                },
            },
        });

        const mappedOrder = order.map((el) => {
            return {
                ...el,
                userTries: el.userTries[0],
            };
        });

        const sortedOrder = mappedOrder.sort((a, b) => {
            if (a.userTries!.timestamp < b.userTries!.timestamp) {
                return 1;
            }

            if (a.userTries!.timestamp > b.userTries!.timestamp) {
                return -1;
            }

            return 0;
        });

        return sortedOrder[0]?.nthPlayerToGuess;
    };

    findAlbumInPool = async (albumId: string) => {
        return await prisma.albumPools.findUnique({
            where: {
                albumId,
            },
        });
    };

    addDailyAlbumTry = async (userId: string, dailyAlbumId: string, guessedAlbumId: string) => {
        const status = dailyAlbumId === guessedAlbumId ? 'FINISHED' : 'UNFINISHED';
        const lastGuess = await prisma.dailyAlbumTry.findFirst({
            where: {
                userDailyAlbum: {
                    userId,
                },
            },
            orderBy: { nthTry: 'desc' },
        });
        const nthTry = lastGuess?.nthTry;

        const lastPosition = await this.getLastPlayerToGuessPosition(dailyAlbumId);

        return await prisma.userDailyAlbum.upsert({
            where: {
                userId_dailyAlbumId: {
                    userId,
                    dailyAlbumId,
                },
            },
            create: {
                status,
                dailyAlbumId,
                userId,
                nthPlayerToGuess: status === 'FINISHED' ? (lastPosition ?? 0) + 1 : null,
                userTries: {
                    create: {
                        albumGuessId: guessedAlbumId,
                        timestamp: new Date(),
                        nthTry: (nthTry ?? 0) + 1,
                    },
                },
            },
            update: {
                status,
                nthPlayerToGuess: status === 'FINISHED' ? (lastPosition ?? 0) + 1 : null,
                userTries: {
                    create: {
                        albumGuessId: guessedAlbumId,
                        timestamp: new Date(),
                        nthTry: (nthTry ?? 0) + 1,
                    },
                },
            },
        });
    };

    addAlbumToPool = async (albumId: string) => {
        return await prisma.albumPools.create({
            data: {
                albumId,
            },
        });
    };

    addDailyAlbum = async (
        albumId: string,
        date: string,
        lastfmData: { lastfmListeners: string; lastfmPlaycount: string }
    ) => {
        return await prisma.dailyAlbum.create({
            data: {
                albumId,
                date: new Date(date),
                lastfmListeners: lastfmData.lastfmListeners,
                lastfmPlaycount: lastfmData.lastfmPlaycount,
            },
        });
    };

    unelectableAlbumInPool = async (albumId: string) => {
        return await prisma.albumPools.update({
            where: {
                albumId,
            },
            data: {
                electable: false,
            },
        });
    };

    updateUserDailyAlbumOverallStatistics = async (
        userId: string,
        tries: number,
        isFinished: boolean
    ) => {
        const userStatistics =
            (await this.getUserDailyAlbumOverallStatistics(userId)) ||
            (await prisma.userDailyAlbumOverallStatistics.create({
                data: {
                    correctlyGuessed: 0,
                    currentStreak: 0,
                    maxStreak: 0,
                    meanToGuess: 0,
                    numberOfFirstGuesses: 0,
                    totalGuessed: 0,
                    userId,
                },
            }));

        const data: Prisma.UserDailyAlbumOverallStatisticsUpdateInput = {};

        if (userStatistics.meanToGuess === 0 && isFinished) {
            data.meanToGuess = tries;
        }

        if (userStatistics.meanToGuess > 0 && isFinished) {
            data.meanToGuess =
                (userStatistics.meanToGuess * userStatistics.correctlyGuessed + tries) /
                (userStatistics.correctlyGuessed + 1);
        }

        data.totalGuessed = { increment: 1 };

        if (isFinished) {
            data.correctlyGuessed = { increment: 1 };
            data.currentStreak = { increment: 1 };
        }

        if (isFinished && tries === 1) {
            data.numberOfFirstGuesses = { increment: 1 };
        }

        if (userStatistics.currentStreak + 1 > userStatistics.maxStreak) {
            data.maxStreak = { increment: 1 };
        }

        return await prisma.userDailyAlbumOverallStatistics.upsert({
            where: {
                userId,
            },
            create: {
                correctlyGuessed: isFinished ? 1 : 0,
                currentStreak: isFinished ? 1 : 0,
                maxStreak: isFinished ? 1 : 0,
                meanToGuess: tries,
                numberOfFirstGuesses: isFinished && tries === 1 ? 1 : 0,
                totalGuessed: 1,
                userId,
            },
            update: {
                ...data,
            },
        });
    };
}

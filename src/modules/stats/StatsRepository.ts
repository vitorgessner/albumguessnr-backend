import { prisma } from '../../config/prisma';
import type { Prisma } from '../../generated/prisma/client';

export interface IConfig {
    album: {
        isGuessed: boolean | undefined;
        isCorrect: boolean;
        id: string;
    };
    artist: {
        isGuessed: boolean | undefined;
        isCorrect: boolean;
    };
    genre: {
        isGuessed: boolean | undefined;
        isCorrect: boolean;
    };
    year: {
        isGuessed: boolean | undefined;
        isCorrect: boolean;
    };
    tracks: {
        totalTracks: number | undefined;
        guessedTracks: number | undefined;
    };
}

class StatsRepository {
    constructor() {}

    getUserStats = async (userId: string) => {
        return await prisma.userStats.findUnique({
            where: {
                userId,
            },
            omit: {
                totalScore: true,
                id: true,
                userId: true,
            },
        });
    };

    updateUserStats = async (userId: string, config: IConfig, tx?: Prisma.TransactionClient) => {
        const client = tx || prisma;
        const data: Prisma.UserStatsUpdateInput = {};
        const album = await this.findGuessedAlbum(userId, config.album.id);

        if (config.album.isGuessed !== undefined && config.album.isGuessed)
            data.guessedAlbums = { increment: 1 };

        if (config.album.isCorrect) data.rightGuessedAlbums = { increment: 1 };
        if (!album || album.timesGuessed <= 1) data.guessedDistinctAlbums = { increment: 1 };

        if (config.artist.isGuessed !== undefined && config.artist.isGuessed)
            data.guessedArtists = { increment: 1 };
        if (config.artist.isCorrect) data.rightGuessedArtist = { increment: 1 };

        if (config.genre.isGuessed !== undefined && config.genre.isGuessed)
            data.guessedGenres = { increment: 1 };
        if (config.genre.isCorrect) data.rightGuessedGenres = { increment: 1 };

        if (config.year.isGuessed !== undefined && config.year.isGuessed)
            data.guessedYears = { increment: 1 };
        if (config.year.isCorrect) data.rightGuessedYears = { increment: 1 };

        if (config.tracks.totalTracks)
            data.guessedTracks = { increment: config.tracks.totalTracks };
        if (config.tracks.guessedTracks)
            data.rightGuessedTracks = { increment: config.tracks.guessedTracks };

        return await client.userStats.update({
            where: {
                userId,
            },
            data,
        });
    };

    private findGuessedAlbum = async (userId: string, albumId: string) => {
        return await prisma.userAlbumStats.findUnique({
            where: {
                userId_albumId: {
                    userId,
                    albumId,
                },
            },
        });
    };
}

export default StatsRepository;

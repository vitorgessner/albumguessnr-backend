import { Prisma } from '../../../generated/prisma/client.js';
import retryRequest from '../../../shared/utils/retryRequest.js';
import AlbumRepository from '../../album/AlbumRepository.js';
import type GuessRepository from './GuessRepository.js';
import { CategoriesWithScore } from './types/CategoriesWithScore.js';
import { GuessedTrack } from './types/GuessedTrack.js';

class GuessService {
    constructor(
        private guessRepo: GuessRepository,
        private albumRepo: AlbumRepository
    ) {}

    getTimesGuessed = async (userId: string, albumId: string) => {
        return await this.guessRepo.getTimesGuessed(userId, albumId);
    };

    doesAlbumExists = async (albumId: string) => {
        const album = await this.albumRepo.get(albumId);

        return album ? true : false;
    };

    updateUserAlbumStats = async (userId: string, albumId: string) => {
        const guess = await this.guessRepo.upsertUserAlbumStats(userId, albumId);

        return guess;
    };

    makeGuessAttempt = async (
        userId: string,
        albumId: string,
        timeSpent: number,
        totalScore: number,
        categories: CategoriesWithScore[],
        guessedTracks: GuessedTrack[]
    ) => {
        this.guessRepo
            .makeGuessAttempt(userId, albumId, timeSpent, totalScore, categories, guessedTracks)
            .catch((e) => {
                if (e instanceof Prisma.PrismaClientKnownRequestError) {
                    retryRequest(
                        () =>
                            this.guessRepo.makeGuessAttempt(
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
}

export default GuessService;

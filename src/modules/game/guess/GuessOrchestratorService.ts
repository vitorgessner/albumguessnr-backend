import TransactionRepository from '../../../shared/TransactionRepo';
import StatsRepository, { IConfig } from '../../stats/StatsRepository';
import GuessRepository from './GuessRepository';
import { CategoriesWithScore } from './types/CategoriesWithScore';
import { GuessedCategories } from './types/GuessedCategories';
import { GuessedTrack } from './types/GuessedTrack';

class GuessOrchestratorService {
    constructor(
        private guessRepo: GuessRepository,
        private statsRepo: StatsRepository,
        private transactionRepo: TransactionRepository
    ) {}

    processGuessAttempt = async (
        userId: string,
        albumId: string,
        timeSpent: number,
        totalScore: number,
        categories: CategoriesWithScore[],
        guessedTracks: GuessedTrack[],
        guessedCategories: GuessedCategories
    ) => {
        const config: IConfig = {
            album: {
                isGuessed: true,
                isCorrect: guessedCategories.album,
                id: albumId,
            },
            artist: {
                isGuessed: guessedCategories.artist !== undefined ? true : undefined,
                isCorrect: guessedCategories.artist ?? false,
            },
            genre: {
                isGuessed: guessedCategories.genre !== undefined ? true : undefined,
                isCorrect: guessedCategories.genre ?? false,
            },
            year: {
                isGuessed: guessedCategories.year !== undefined ? true : undefined,
                isCorrect: guessedCategories.year ?? false,
            },
            tracks: {
                totalTracks: guessedCategories.tracklist?.length,
                guessedTracks: guessedCategories.tracklist?.filter((t) => t.isCorrect).length,
            },
        };

        await this.transactionRepo.transaction(async (tx) => {
            await this.guessRepo.upsertUserAlbumStats(userId, albumId, tx);
            await this.guessRepo.makeGuessAttempt(
                userId,
                albumId,
                timeSpent,
                totalScore,
                categories,
                guessedTracks,
                tx
            );
            await this.statsRepo.updateUserStats(userId, config, tx);
        });
    };
}

export default GuessOrchestratorService;

import ValidationError from '../../shared/errors/ValidationError';
import AuthRepository from '../auth/AuthRepository';
import AuthError from '../auth/errors/AuthError';
import { GuessedCategories } from '../game/guess/types/GuessedCategories';
import StatsRepository from './StatsRepository';

class StatsService {
    constructor(
        private statsRepo: StatsRepository,
        private authRepo: AuthRepository
    ) {}

    getUserStats = async (username: string | string[] | undefined) => {
        if (!username) throw new ValidationError(400, 'Username not provided');
        if (typeof username === 'object')
            throw new ValidationError(400, 'Username must be a string');

        const user = await this.authRepo.findByUsername(username);
        if (!user) throw new AuthError(404, 'User with the username provided not found');

        const userStats = await this.statsRepo.getUserStats(user.userId);

        return userStats ?? null;
    };

    updateUserStats = async (
        userId: string,
        albumId: string,
        guessedCategories: GuessedCategories
    ) => {
        const guessedTracks = guessedCategories.tracklist;
        const rightGuessedTracks = guessedTracks?.filter((g) => g.isCorrect);

        return this.statsRepo.updateUserStats(userId, {
            album: {
                isGuessed: guessedCategories.album,
                isCorrect: guessedCategories.album === true,
                id: albumId,
            },
            artist: {
                isGuessed: guessedCategories.artist,
                isCorrect: guessedCategories.artist === true,
            },
            genre: {
                isGuessed: guessedCategories.genre,
                isCorrect: guessedCategories.genre === true,
            },
            year: {
                isGuessed: guessedCategories.year,
                isCorrect: guessedCategories.year === true,
            },
            tracks: {
                totalTracks: guessedCategories.tracklist?.length ?? undefined,
                guessedTracks:
                    rightGuessedTracks?.length && rightGuessedTracks.length > 0
                        ? rightGuessedTracks.length
                        : undefined,
            },
        });
    };
}

export default StatsService;

import ValidationError from '../../shared/errors/ValidationError.js';
import ScoringRepository from './ScoringRepository.js';
import { config } from './utils/config.js';
import { timeMult } from './utils/timeMult.js';

interface GuessedCategories {
    album: boolean;
    artist?: boolean;
    genre?: boolean;
    year?: boolean;
    tracklist?: number;
}

type GameCategory = keyof ReturnType<typeof config>;

class ScoringService {
    constructor(private scoringRepo: ScoringRepository) {}

    makeGuess = async (
        userId: string,
        albumId: string,
        timeSpent: number,
        guessedCategories: GuessedCategories
    ) => {
        const totalScore = await this.calculateTotalScore(albumId, timeSpent, guessedCategories);
        const date = new Date();

        const previousScore = await this.scoringRepo.findBestScore(userId, albumId);
        const isNewBestScore = (previousScore._max.totalScore ?? 0) < totalScore.totalScore;

        await this.scoringRepo.makeGuess(
            userId,
            albumId,
            date,
            totalScore.totalScore,
            timeSpent,
            totalScore.categories
        );

        return { score: Math.round(totalScore.totalScore / 100), isNewBestScore };
    };

    private calculateTotalScore = async (
        albumId: string,
        timeSpent: number,
        guessedCategories: GuessedCategories
    ) => {
        const length = await this.getTracksLength(albumId);
        const gameConfig = config(length.id);

        let totalTime = 0;
        const categories = [];

        for (const [key] of Object.entries(guessedCategories)) {
            const points = await this.calculateCategoryScore(
                length.id,
                key as GameCategory,
                guessedCategories
            );

            if (points) {
                categories.push(points);
                totalTime += gameConfig[key as GameCategory].expectedTime;
            }
        }

        const remainingTime = totalTime - timeSpent <= 0 ? 0 : totalTime - timeSpent;
        // const timeMultiplier = timeMult((remainingTime * 100) / totalTime);
        const timeMultiplier = remainingTime / totalTime + 1;

        const formattedCategories = categories.map((c) => {
            return {
                score: Math.round(c.score * timeMultiplier * 100),
                category: c.category.toUpperCase() as
                    | 'ALBUM'
                    | 'ARTIST'
                    | 'GENRE'
                    | 'YEAR'
                    | 'TRACKLIST',
            };
        });

        return {
            totalScore: Math.round(formattedCategories.reduce((acc, cur) => acc + cur.score, 0)),
            categories: formattedCategories,
        };
    };

    getTracksLength = async (albumId: string) => {
        const album = await this.scoringRepo.findAlbum(albumId);
        if (!album) throw new ValidationError(404, 'No album found');

        const tracksLength = await this.scoringRepo.getTracksLength(albumId);
        if (!tracksLength) throw new ValidationError(500, 'Some error ocurred');

        return tracksLength._count;
    };

    private calculateCategoryScore = (
        length: number,
        category: GameCategory,
        guessedCategories: GuessedCategories
    ) => {
        const gameConfig = config(length);

        if (guessedCategories[category] !== undefined) {
            if (category === 'tracklist' && guessedCategories['tracklist']) {
                const rightAnswers = guessedCategories.tracklist;
                return {
                    category: category,
                    score: (gameConfig.tracklist.basePoints / length) * rightAnswers,
                };
            }

            return guessedCategories[category]
                ? { category, score: gameConfig[category].basePoints }
                : { category, score: 0 };
        }

        return null;
    };
}

export default ScoringService;

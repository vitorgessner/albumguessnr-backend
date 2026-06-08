import ValidationError from '../../shared/errors/ValidationError.js';
import AlbumRepository from '../album/AlbumRepository.js';
import { GuessedTrack } from '../game/guess/types/GuessedTrack.js';
import type StatsRepository from '../stats/StatsRepository.js';
import ScoringRepository from './ScoringRepository.js';
import { basePointsAndExpectedTimePerCategory } from './utils/basePoints.js';

interface GuessedCategories {
    album: boolean;
    artist?: boolean;
    genre?: boolean;
    year?: boolean;
    tracklist?: GuessedTrack[];
}

type GameCategory = keyof ReturnType<typeof basePointsAndExpectedTimePerCategory>;

class ScoringService {
    constructor(
        private scoringRepo: ScoringRepository,
        private statsRepo: StatsRepository,
        private albumRepo: AlbumRepository
    ) {}

    handleBestScore = async (
        userId: string,
        albumId: string,
        totalScoreWithCategories: {
            totalScore: number;
            categoriesWithScore: {
                score: number;
                category: 'ALBUM' | 'ARTIST' | 'GENRE' | 'YEAR' | 'TRACKLIST';
            }[];
        }
    ) => {
        const date = new Date();

        const previousScore = await this.scoringRepo.findBestScore(userId, albumId);
        const oldGlobalBestScore = previousScore._max.totalScore ?? 0;

        const isNewBestScore = oldGlobalBestScore < totalScoreWithCategories.totalScore;

        if (isNewBestScore) {
            await this.scoringRepo.handleBestScore(
                userId,
                albumId,
                date,
                totalScoreWithCategories.totalScore,
                totalScoreWithCategories.categoriesWithScore,
                oldGlobalBestScore
            );
        }

        return { score: Math.round(totalScoreWithCategories.totalScore / 100), isNewBestScore };
    };

    calculateTotalScore = async (
        albumId: string,
        timeSpent: number,
        guessedCategories: GuessedCategories
    ) => {
        const length = await this.getTracksLength(albumId);
        const pointsConfig = basePointsAndExpectedTimePerCategory(length.id);

        let totalTime = 0;
        const categories = [];

        for (const [key] of Object.entries(guessedCategories)) {
            const points = this.calculateCategoryScore(
                length.id,
                key as GameCategory,
                guessedCategories
            );

            if (points) {
                categories.push(points);
                totalTime += pointsConfig[key as GameCategory].expectedTime;
            }
        }

        const remainingTime = totalTime - timeSpent;
        const finalTime = remainingTime <= 0 ? 0 : remainingTime;
        const timeMultiplier = finalTime / totalTime + 1;

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
            categoriesWithScore: formattedCategories,
        };
    };

    getTracksLength = async (albumId: string) => {
        const album = await this.albumRepo.get(albumId);
        if (!album) throw new ValidationError(404, 'No album found');

        const tracksLength = await this.albumRepo.getTracksLength(albumId);
        if (!tracksLength) throw new ValidationError(500, 'Some error occurred');

        return tracksLength._count;
    };

    private calculateCategoryScore = (
        length: number,
        category: GameCategory,
        guessedCategories: GuessedCategories
    ) => {
        const pointsConfig = basePointsAndExpectedTimePerCategory(length);

        if (guessedCategories[category] === undefined) return null;

        if (category === 'tracklist' && guessedCategories['tracklist']) {
            const rightAnswers = guessedCategories.tracklist.filter((track) => track.isCorrect);

            return {
                category: category,
                score: (pointsConfig.tracklist.basePoints / length) * rightAnswers.length,
            };
        }

        if (guessedCategories[category])
            return { category, score: pointsConfig[category].basePoints };

        return { category, score: 0 };
    };
}

export default ScoringService;

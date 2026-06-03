import type { Request, Response } from 'express';
import type GuessService from './GuessService.js';
import AuthError from '../../auth/errors/AuthError.js';
import GuessError from './errors/GuessError.js';
import ScoringService from '../../scoring/ScoringService.js';
import ValidationError from '../../../shared/errors/ValidationError.js';
import { GuessedCategories } from './types/GuessedCategories.js';
import GuessOrchestratorService from './GuessOrchestratorService.js';

class GuessController {
    constructor(
        private guessService: GuessService,
        private scoringService: ScoringService,
        private guessOrchestratorService: GuessOrchestratorService
    ) {}

    getTimesGuessed = async (req: Request, res: Response) => {
        const userId = req.userId;
        if (!userId) throw new AuthError(401, 'Unauthorized');

        const { albumId } = req.params;
        if (!albumId || typeof albumId !== 'string') throw new GuessError(404, 'Invalid albumId');

        if (!(await this.guessService.doesAlbumExists(albumId)))
            throw new ValidationError(404, 'Album not found');

        const response = await this.guessService.getTimesGuessed(userId, albumId as string);

        res.status(200).json({ timesGuessed: response?.timesGuessed });
    };

    makeGuessAttempt = async (req: Request, res: Response) => {
        const userId = req.userId;
        if (!userId) throw new AuthError(401, 'Unauthorized');

        const { albumId, timeSpent } = req.body;
        const guessedCategories = req.body.guessedCategories as GuessedCategories;

        if (typeof albumId !== 'string' || typeof timeSpent !== 'number')
            throw new ValidationError(400, 'Album id is not string or timeSpent is not a number');
        if (!(await this.guessService.doesAlbumExists(albumId)))
            throw new ValidationError(404, 'Album not found');

        const totalScore = await this.scoringService.calculateTotalScore(
            albumId,
            timeSpent,
            guessedCategories
        );

        const [finalScore] = await Promise.all([
            this.scoringService.handleBestScore(userId, albumId, timeSpent, guessedCategories),
            this.guessOrchestratorService.processGuessAttempt(
                userId,
                albumId,
                timeSpent,
                totalScore.totalScore,
                totalScore.categoriesWithScore,
                guessedCategories.tracklist ?? [],
                guessedCategories
            ),
        ]);
        return res.status(200).json({
            status: 'success',
            message: 'Guess attempt successfull',
            totalScore: finalScore.score,
            isNewBestScore: finalScore.isNewBestScore,
        });
    };
}

export default GuessController;

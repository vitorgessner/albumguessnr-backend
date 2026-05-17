import type { Request, Response } from 'express';
import type ScoringService from './ScoringService.js';
import AuthError from '../auth/errors/AuthError.js';
import { config } from './utils/config.js';

class ScoringController {
    constructor(private scoringService: ScoringService) {}

    makeGuess = async (req: Request, res: Response) => {
        const userId = req.userId;
        if (!userId) throw new AuthError(401, 'Not logged in');

        const { albumId, timeSpent, guessedCategories } = req.body;

        const totalScore = await this.scoringService.makeGuess(
            userId,
            albumId,
            timeSpent,
            guessedCategories
        );

        res.status(200).json({
            status: 'success',
            message: 'succeed',
            totalScore: totalScore.score,
            isNewBestScore: totalScore.isNewBestScore,
        });
    };

    config = async (req: Request, res: Response) => {
        const albumId = req.params.albumId;
        const n = await this.scoringService
            .getTracksLength(albumId as string)
            .then((res) => res.id);

        const gameConfig = config(n);

        res.status(200).json({ status: 'success', message: 'Config fetched', config: gameConfig });
    };
}

export default ScoringController;

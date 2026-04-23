import type { Request, Response } from 'express';
import type GuessService from './GuessService.js';
import AuthError from '../../auth/errors/AuthError.js';
import GuessError from './errors/GuessError.js';

class GuessContoller {
    private guessService: GuessService;
    constructor(guessService: GuessService) {
        this.guessService = guessService;
    }

    getTimesGuessed = async (req: Request, res: Response) => {
        const userId = req.userId;
        if (!userId) throw new AuthError(401, 'Unauthorized');

        const { albumId } = req.params;
        if (!albumId) throw new GuessError(404, 'Album ID not found');

        const response = await this.guessService.getTimesGuessed(userId, albumId as string);

        res.status(200).json({ timesGuessed: response?.timesGuessed });
    };

    makeGuess = async (req: Request, res: Response) => {
        const userId = req.userId;
        if (!userId) throw new AuthError(401, 'Unauthorized');

        const { albumId } = req.body;
        if (!albumId) throw new GuessError(404, 'Album ID not found');

        const response = await this.guessService.guess(userId, albumId);

        res.status(200).json({ guess: response });
    };
}

export default GuessContoller;

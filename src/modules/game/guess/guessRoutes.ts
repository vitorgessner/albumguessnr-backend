import { Router, type Request, type Response } from 'express';
import type GuessController from './GuessController.js';

const guessRoutes = (controller: GuessController) => {
    const router = Router();

    router.get('/recently', (req: Request, res: Response) =>
        controller.getLastTenPlayers(req, res)
    );

    router.get('/:albumId', (req: Request, res: Response) =>
        controller.getUserGuessStats(req, res)
    );

    router.post('/', (req: Request, res: Response) => controller.makeGuessAttempt(req, res));

    return router;
};

export default guessRoutes;

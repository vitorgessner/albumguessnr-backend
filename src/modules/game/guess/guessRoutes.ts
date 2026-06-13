import { Router, type Request, type Response } from 'express';
import type GuessContoller from './GuessController.js';

const guessRoutes = (controller: GuessContoller) => {
    const router = Router();

    router.get('/recently', (req: Request, res: Response) =>
        controller.getLastTenPlayers(req, res)
    );

    router.get('/:albumId', (req: Request, res: Response) => controller.getTimesGuessed(req, res));

    router.post('/', (req: Request, res: Response) => controller.makeGuessAttempt(req, res));

    return router;
};

export default guessRoutes;

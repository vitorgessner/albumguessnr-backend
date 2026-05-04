import { Router, type Request, type Response } from 'express';
import type GuessContoller from './GuessController.js';
import { asyncHandler } from '../../../app.js';

const guessRoutes = (controller: GuessContoller) => {
    const router = Router();

    router.get(
        '/:albumId',
        asyncHandler((req: Request, res: Response) => controller.getTimesGuessed(req, res))
    );

    router.put(
        '/',
        asyncHandler((req: Request, res: Response) => controller.makeGuess(req, res))
    );

    return router;
};

export default guessRoutes;

import { Router, type Request, type Response } from 'express';
import type ScoringController from './ScoringController.js';

const scoringRoutes = (controller: ScoringController) => {
    const router = Router();

    router.get('/config/:albumId', (req: Request, res: Response) => controller.config(req, res));

    router.post('/', (req: Request, res: Response) => controller.makeGuess(req, res));

    return router;
};

export default scoringRoutes;

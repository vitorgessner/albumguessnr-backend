import { Router, type Request, type Response } from 'express';
import type ScoringController from './ScoringController.js';

const scoringRoutes = (controller: ScoringController) => {
    const router = Router();

    router.get('/config/:albumId', (req: Request, res: Response) =>
        controller.getPointsConfig(req, res)
    );

    router.post('/', (req: Request, res: Response) => controller.handleBestScore(req, res));

    return router;
};

export default scoringRoutes;

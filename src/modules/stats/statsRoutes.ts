import { type Request, type Response, Router } from 'express';
import StatsController from './StatsController';

const statsRoutes = (controller: StatsController) => {
    const router = Router();

    router.get('/:username', (req: Request, res: Response) => controller.getUserStats(req, res));

    return router;
};

export default statsRoutes;

import { Router } from 'express';
import { AnalyticsController } from './AnalyticsController';
import { adminAuthMiddleware } from '../auth/middlewares/adminAuthMiddleware';
import type { Request, Response } from 'express';

export const analyticsRoutes = (controller: AnalyticsController) => {
    const router = Router();

    router.post('/blocked', adminAuthMiddleware, (req: Request, res: Response) =>
        controller.incrementBlocked(req, res)
    );

    router.post('/checked', adminAuthMiddleware, (req: Request, res: Response) =>
        controller.incrementChecked(req, res)
    );

    return router;
};

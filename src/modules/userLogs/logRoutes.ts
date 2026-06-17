import { Router, type Request, type Response } from 'express';
import { LogController } from './LogController';

export const logRoutes = (controller: LogController) => {
    const router = Router();

    router.post('/:userId', (req: Request, res: Response) =>
        controller.saveUserAlbumErrorLog(req, res)
    );

    return router;
};

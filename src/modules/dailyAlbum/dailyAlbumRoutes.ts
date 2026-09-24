import { Router } from 'express';
import { DailyAlbumController } from './DailyAlbumController';
import { adminAuthMiddleware } from '../auth/middlewares/adminAuthMiddleware';
import setLimiter from '../auth/middlewares/limiter';

export const dailyAlbumRoutes = (controller: DailyAlbumController) => {
    const router = Router();

    router.post('/import', adminAuthMiddleware, (req, res) =>
        controller.saveAlbumsAndAddToPool(req, res)
    );

    router.get('/album', (req, res) => controller.getDailyAlbum(req, res));

    router.post('/album', setLimiter(15, 1), adminAuthMiddleware, (req, res) =>
        controller.defineDailyAlbumForDayAfterTomorrow(req, res)
    );

    router.post('/find', (req, res) => controller.findPossibleAlbums(req, res));

    router.post('/album/try', (req, res) => controller.addDailyAlbumTry(req, res));

    router.get('/album/statistics', (req, res) => controller.getUserDailyAlbumStatistics(req, res));

    router.get('/album/overall/statistics', (req, res) =>
        controller.getUserDailyAlbumOverallStatistics(req, res)
    );

    router.put('/album/overall/statistics', (req, res) =>
        controller.updateUserDailyAlbumOverallStatistics(req, res)
    );

    return router;
};

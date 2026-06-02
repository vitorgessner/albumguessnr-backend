import { Router, type Request, type Response } from 'express';
import type LeaderboardsController from './LeaderboardsController.js';

const leaderboardsRoutes = (controller: LeaderboardsController) => {
    const router = Router();

    router.get('/', (req: Request, res: Response) => controller.getGlobalLeaderboard(req, res));
    router.get('/friends', (req: Request, res: Response) =>
        controller.getFriendsLeaderboard(req, res)
    );

    router.get('/:period', (req: Request, res: Response) =>
        controller.getPeriodGlobalLeaderboard(req, res)
    );
    router.get('/friends/:period', (req: Request, res: Response) =>
        controller.getPeriodFriendsLeaderboard(req, res)
    );

    router.get('/category/:category', (req: Request, res: Response) =>
        controller.getCategoryLeaderboard(req, res)
    );
    router.get('/friends/category/:category', (req: Request, res: Response) =>
        controller.getFriendsCategoryLeaderboard(req, res)
    );

    router.get('/category/:category/:period', (req: Request, res: Response) =>
        controller.getPeriodCategoryLeaderboard(req, res)
    );
    router.get('/friends/category/:category/:period', (req: Request, res: Response) =>
        controller.getFriendsPeriodCategoryLeaderboard(req, res)
    );

    router.get('/accuracy/category/tracklist', (req: Request, res: Response) =>
        controller.getTracklistAccuracyLeaderboard(req, res)
    );
    router.get('/friends/accuracy/category/tracklist', (req: Request, res: Response) =>
        controller.getFriendsTracklistAccuracyLeaderboard(req, res)
    );

    router.get('/accuracy/category/:category', (req: Request, res: Response) =>
        controller.getCategoryAccuracyLeaderboard(req, res)
    );
    router.get('/friends/accuracy/category/:category', (req: Request, res: Response) =>
        controller.getFriendsCategoryAccuracyLeaderboard(req, res)
    );

    router.get('/accuracy/category/tracklist/:period', (req: Request, res: Response) =>
        controller.getPeriodTracklistAccuracyLeaderboard(req, res)
    );
    router.get('/friends/accuracy/category/tracklist/:period', (req: Request, res: Response) =>
        controller.getFriendsPeriodTracklistAccuracyLeaderboard(req, res)
    );

    router.get('/accuracy/category/:category/:period', (req: Request, res: Response) =>
        controller.getPeriodCategoryAccuracyLeaderboard(req, res)
    );
    router.get('/friends/accuracy/category/:category/:period', (req: Request, res: Response) =>
        controller.getFriendsPeriodCategoryAccuracyLeaderboard(req, res)
    );

    return router;
};

export default leaderboardsRoutes;

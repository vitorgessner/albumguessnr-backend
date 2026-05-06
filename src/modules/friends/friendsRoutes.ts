import { Router, type Request, type Response } from 'express';
import type FriendsController from './FriendsController.js';

const friendsRoutes = (controller: FriendsController) => {
    const router = Router();

    router.get('/', (req: Request, res: Response) => controller.getFriends(req, res));

    router.post('/:requestedUserId', (req: Request, res: Response) =>
        controller.makeRequest(req, res)
    );

    router.post('/accept/:requesterUserId', (req: Request, res: Response) =>
        controller.acceptRequest(req, res)
    );

    router.post('/deny/:requesterUserId', (req: Request, res: Response) =>
        controller.denyRequest(req, res)
    );

    router.delete('/unfriend/:friendId', (req: Request, res: Response) =>
        controller.unfriend(req, res)
    );

    return router;
};

export default friendsRoutes;

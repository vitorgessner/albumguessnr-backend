import { Router, type Request, type Response } from 'express';
import type FriendsController from './FriendsController.js';

const friendsRoutes = (controller: FriendsController) => {
    const router = Router();

    router.get('/:username', (req: Request, res: Response) => controller.getFriends(req, res));

    router.get('/:username/status', (req: Request, res: Response) =>
        controller.getStatus(req, res)
    );

    router.post('/:receivedRequestsId', (req: Request, res: Response) =>
        controller.makeRequest(req, res)
    );

    router.patch('/:receivedRequestsId', (req: Request, res: Response) =>
        controller.cancelRequest(req, res)
    );

    router.post('/accept/:sentRequestsId', (req: Request, res: Response) =>
        controller.acceptRequest(req, res)
    );

    router.post('/deny/:sentRequestsId', (req: Request, res: Response) =>
        controller.denyRequest(req, res)
    );

    router.delete('/:friendId', (req: Request, res: Response) => controller.unfriend(req, res));

    return router;
};

export default friendsRoutes;

import { Router, type Request, type Response } from 'express';
import type IntegrationController from './IntegrationController.js';

const integrationRoutes = (controller: IntegrationController) => {
    const router = Router();

    router.put('/', (req: Request, res: Response) => controller.createOrConnectLasfmUser(req, res));

    router.get('/albums/:lastfmUsername', (req: Request, res: Response) =>
        controller.fetchUserAlbums(req, res)
    );

    return router;
};

export default integrationRoutes;

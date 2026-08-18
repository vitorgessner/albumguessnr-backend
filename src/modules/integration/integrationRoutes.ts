import { Router, type Request, type Response } from 'express';
import type IntegrationController from './IntegrationController.js';

const integrationRoutes = (controller: IntegrationController) => {
    const router = Router();

    router.get('/albums/', (req: Request, res: Response) => controller.getAlbums(req, res));

    return router;
};

export default integrationRoutes;

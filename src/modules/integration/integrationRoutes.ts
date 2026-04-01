import { Router, type Request, type Response } from 'express';
import type IntegrationController from './IntegrationController.js';

const integrationRoutes = (controller: IntegrationController) => {
    const router = Router();

    router.put('/:username', (req: Request, res: Response) =>
        controller.createOrConnectLasfmUser(req, res)
    );

    return router;
};

export default integrationRoutes;

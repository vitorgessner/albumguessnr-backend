import { Router, type Request, type Response } from 'express';
import { ProviderController } from './ProviderController';

const providerRoutes = (controller: ProviderController) => {
    const router = Router();

    router.delete('/spotify', async (req: Request, res: Response) =>
        controller.deleteSpotify(req, res)
    );

    router.delete('/lastfm', async (req: Request, res: Response) =>
        controller.deleteLastfm(req, res)
    );

    return router;
};

export default providerRoutes;

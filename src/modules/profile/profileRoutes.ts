import { Router, type Request, type Response } from 'express';
import type ProfileController from './ProfileController.js';

const profileRoutes = (controller: ProfileController) => {
    const router = Router();

    router.patch('/:username/edit', (req: Request, res: Response) => controller.edit(req, res));

    return router;
};

export default profileRoutes;

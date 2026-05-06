import { Router, type Request, type Response } from 'express';
import type ProfileController from './ProfileController.js';
import upload from '../../shared/config/multer.js';

const profileRoutes = (controller: ProfileController) => {
    const router = Router();

    router.get('/:username', (req: Request, res: Response) => controller.getProfile(req, res));

    router.patch('/:username/edit', upload.single('pfp'), (req: Request, res: Response) =>
        controller.edit(req, res)
    );

    return router;
};

export default profileRoutes;

import { Router, type Request, type Response } from 'express';
import type AuthController from './AuthController.js';

const authRoutes = (controller: AuthController) => {
    const router = Router();
    router.get('/users', (req: Request, res: Response) => controller.getAllUsers(req, res));
    router.post('/login', (req: Request, res: Response) => controller.login(req, res));
    router.post('/register', (req: Request, res: Response) => controller.create(req, res));

    return router;
};

export default authRoutes;

import { Router, type Request, type Response } from 'express';
import type AuthController from './AuthController.js';
import authMiddleware from './middlewares/authMiddleware.js';

const authRoutes = (controller: AuthController) => {
    const router = Router();
    router.get('/users', (req: Request, res: Response) => controller.getAllUsers(req, res));
    router.get('/users/profiles', (req: Request, res: Response) =>
        controller.getAllUsersWithProfile(req, res)
    );
    router.get('/me', authMiddleware, (req: Request, res: Response) => controller.me(req, res));
    router.get('/verify/:userVerificationToken', (req: Request, res: Response) =>
        controller.verifyUser(req, res)
    );
    router.post('/login', (req: Request, res: Response) => controller.login(req, res));
    router.post('/logout', (req: Request, res: Response) => controller.logout(req, res));
    router.post('/register', (req: Request, res: Response) => controller.create(req, res));

    return router;
};

export default authRoutes;

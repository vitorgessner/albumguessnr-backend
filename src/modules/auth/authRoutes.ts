import { Router, type Request, type Response } from 'express';
import type AuthController from './AuthController.js';
import authMiddleware from './middlewares/authMiddleware.js';
import setLimiter from './middlewares/limiter.js';
import validateBody from './middlewares/validateBody.js';
import {
    changePasswordSchema,
    forgotPasswordSchema,
    formSchema,
    registerSchema,
} from './schemas/authSchema.js';

const authRoutes = (controller: AuthController) => {
    const router = Router();
    router.get('/users', (req: Request, res: Response) => controller.getAllUsers(req, res));
    router.get('/users/profiles', (req: Request, res: Response) =>
        controller.getAllUsersWithProfile(req, res)
    );
    router.get('/users/lastfm', (req: Request, res: Response) =>
        controller.getAllUsersWithLastfmIntegration(req, res)
    );
    router.get('/me', authMiddleware, (req: Request, res: Response) => controller.me(req, res));
    router.get('/verify/:userVerificationToken', setLimiter(15, 3), (req: Request, res: Response) =>
        controller.verifyUser(req, res)
    );

    router.post(
        '/login',
        setLimiter(3, 10),
        validateBody(formSchema),
        (req: Request, res: Response) => controller.login(req, res)
    );
    router.post('/logout', (req: Request, res: Response) => controller.logout(req, res));
    router.post(
        '/register',
        setLimiter(0.1, 3),
        validateBody(registerSchema),
        (req: Request, res: Response) => controller.create(req, res)
    );
    router.post('/resendVerification', setLimiter(10, 3), (req: Request, res: Response) =>
        controller.resendVerification(req, res)
    );

    router.post(
        '/forgot',
        setLimiter(60, 1),
        validateBody(forgotPasswordSchema),
        (req: Request, res: Response) => controller.forgot(req, res)
    );

    router.put(
        '/:username/passwordChange',
        validateBody(changePasswordSchema),
        (req: Request, res: Response) => controller.changePassword(req, res)
    );

    return router;
};

export default authRoutes;

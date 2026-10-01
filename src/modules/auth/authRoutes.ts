import { Router, type Request, type Response } from 'express';
import type AuthController from './AuthController.js';
import setLimiter from './middlewares/limiter.js';
import validateBody from './middlewares/validateBody.js';
import {
    changePasswordSchema,
    forgotPasswordSchema,
    formSchema,
    registerSchema,
} from './schemas/authSchema.js';
import authMiddleware from './middlewares/authMiddleware.js';
import { optionalAuth } from './middlewares/optionalAuth.js';
import AuthService from './AuthService.js';
import { requireFullAccountMiddleware } from './middlewares/requireFullAccountMiddleware.js';

const authRoutes = (controller: AuthController, authService: AuthService) => {
    const router = Router();

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
    router.delete('/logout', (req: Request, res: Response) => controller.logout(req, res));

    router.post(
        '/register',
        optionalAuth(authService),
        setLimiter(0.1, 3),
        validateBody(registerSchema),
        (req: Request, res: Response) => controller.create(req, res)
    );

    router.get('/guest', (req: Request, res: Response) => controller.getGuest(req, res));

    router.post('/guest', setLimiter(0.1, 3), (req: Request, res: Response) =>
        controller.createGuest(req, res)
    );

    router.post('/resendVerification', setLimiter(10, 3), (req: Request, res: Response) =>
        controller.resendVerification(req, res)
    );

    router.post('/refresh', (req: Request, res: Response) => controller.refresh(req, res));

    router.post(
        '/forgot',
        setLimiter(60, 1),
        validateBody(forgotPasswordSchema),
        (req: Request, res: Response) => controller.forgot(req, res)
    );

    router.put(
        '/passwordChange/:passwordResetToken',
        validateBody(changePasswordSchema),
        (req: Request, res: Response) => controller.changePassword(req, res)
    );

    router.put(
        '/mainProvider',
        authMiddleware,
        requireFullAccountMiddleware,
        (req: Request, res: Response) => controller.setMainProvider(req, res)
    );

    router.delete('/housekeeping/guests', (req: Request, res: Response) =>
        controller.houseKeepGuestsAndTokens(req, res)
    );

    return router;
};

export default authRoutes;

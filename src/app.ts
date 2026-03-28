import express, { type Application } from 'express';
import cors from 'cors';
import authRoutes from './modules/auth/authRoutes.js';
import AuthController from './modules/auth/AuthController.js';
import AuthService from './modules/auth/AuthService.js';
import AuthRepository from './modules/auth/AuthRepository.js';
import globalErrorMiddleware from './shared/middlewares/globalErrorMiddleware.js';
import authMiddleware from './modules/auth/middlewares/authMiddleware.js';
import cookieParser from 'cookie-parser';
import profileRoutes from './modules/profile/profileRoutes.js';
import ProfileRepository from './modules/profile/ProfileRepository.js';
import ProfileService from './modules/profile/ProfileService.js';
import ProfileController from './modules/profile/ProfileController.js';

export const getApp = (): Application => {
    const app = express();
    app.use(
        cors({
            origin: process.env.FRONTEND_URL,
            credentials: true,
        })
    );
    app.use(cookieParser());
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());

    app.use(express.static('public'));

    const authRepo = new AuthRepository();
    const authService = new AuthService(authRepo);
    const authController = new AuthController(authService);

    const profileRepo = new ProfileRepository();
    const profileService = new ProfileService(profileRepo);
    const profileController = new ProfileController(profileService);

    app.use('/', authRoutes(authController));

    app.use(authMiddleware);
    app.use('/profile', profileRoutes(profileController));

    app.get('/auth', authMiddleware, (req, res) => res.json({ message: 'vai tomando' }));

    app.use(globalErrorMiddleware);

    return app;
};

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
// import helmet from 'helmet';
import IntegrationService from './modules/integration/IntegrationService.js';
import IntegrationController from './modules/integration/IntegrationController.js';
import IntegrationRepository from './modules/integration/IntegrationRepository.js';
import integrationRoutes from './modules/integration/integrationRoutes.js';
import AlbumRepository from './modules/album/AlbumRepository.js';
import syncMiddleware from './modules/game/middlewares/syncMiddleware.js';
import gameRoutes from './modules/game/gameRoutes.js';
import GuessRepository from './modules/game/guess/GuessRepository.js';
import GuessService from './modules/game/guess/GuessService.js';
import GuessController from './modules/game/guess/GuessController.js';
import guessRoutes from './modules/game/guess/guessRoutes.js';
import { env } from './shared/config/env.js';

export const getApp = (): Application => {
    const app = express();
    // app.use(
    //     helmet({
    //         crossOriginResourcePolicy: false,
    //     })
    // );
    // app.disable('x-powered-by');
    app.use(
        cors({
            origin: env.FRONTEND_URL,
            credentials: true,
        })
    );
    app.use(cookieParser());
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());

    app.use(express.static('public'));

    const albumRepo = new AlbumRepository();

    const integrationRepo = new IntegrationRepository();
    const integrationService = new IntegrationService(integrationRepo, albumRepo);
    const integrationController = new IntegrationController(integrationService);

    const authRepo = new AuthRepository();
    const authService = new AuthService(authRepo);
    const authController = new AuthController(authService, integrationService);

    const profileRepo = new ProfileRepository();
    const profileService = new ProfileService(profileRepo);
    const profileController = new ProfileController(profileService);

    const guessRepo = new GuessRepository();
    const guessService = new GuessService(guessRepo);
    const guessController = new GuessController(guessService);

    app.use('/', authRoutes(authController));

    app.use(authMiddleware);
    app.use('/profile', profileRoutes(profileController));
    app.use('/integration', integrationRoutes(integrationController));

    const map = new Map<string, boolean>();
    app.use('/game', syncMiddleware(integrationService, map), gameRoutes());
    app.use('/guess', guessRoutes(guessController));

    app.use(globalErrorMiddleware);

    return app;
};
export { env };

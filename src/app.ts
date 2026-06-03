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
import FriendsRepository from './modules/friends/FriendsRepository.js';
import FriendsService from './modules/friends/FriendsService.js';
import FriendsController from './modules/friends/FriendsController.js';
import friendsRoutes from './modules/friends/friendsRoutes.js';
import ScoringRepository from './modules/scoring/ScoringRepository.js';
import ScoringService from './modules/scoring/ScoringService.js';
import ScoringController from './modules/scoring/ScoringController.js';
import scoringRoutes from './modules/scoring/scoringRoutes.js';
import LeaderboardsController from './modules/leaderboards/LeaderboardsController.js';
import LeaderboardsRepository from './modules/leaderboards/LeaderboardsRepository.js';
import LeaderboardsService from './modules/leaderboards/LeaderboardsService.js';
import leaderboardsRoutes from './modules/leaderboards/leaderboardsRoutes.js';
import StatsRepository from './modules/stats/StatsRepository.js';
import StatsService from './modules/stats/StatsService.js';
import StatsController from './modules/stats/StatsController.js';
import statsRoutes from './modules/stats/statsRoutes.js';
import GuessOrchestratorService from './modules/game/guess/GuessOrchestratorService.js';
import TransactionRepository from './shared/TransactionRepo.js';

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

    const transactionRepo = new TransactionRepository();
    const albumRepo = new AlbumRepository();

    const profileRepo = new ProfileRepository();
    const profileService = new ProfileService(profileRepo);
    const profileController = new ProfileController(profileService);

    const integrationRepo = new IntegrationRepository();
    const integrationService = new IntegrationService(integrationRepo, albumRepo, profileRepo);
    const integrationController = new IntegrationController(integrationService);

    const authRepo = new AuthRepository();
    const authService = new AuthService(authRepo, profileRepo);
    const authController = new AuthController(authService, integrationService);

    const friendRepo = new FriendsRepository();
    const friendService = new FriendsService(friendRepo, profileRepo, albumRepo);
    const friendController = new FriendsController(friendService);

    const statsRepo = new StatsRepository();
    const statsService = new StatsService(statsRepo, profileRepo);
    const statsController = new StatsController(statsService);

    const scoringRepo = new ScoringRepository();
    const scoringService = new ScoringService(scoringRepo, statsRepo, albumRepo);
    const scoringController = new ScoringController(scoringService);

    const guessRepo = new GuessRepository();
    const guessService = new GuessService(guessRepo, albumRepo);
    const guessOrchestratorService = new GuessOrchestratorService(
        guessRepo,
        statsRepo,
        transactionRepo
    );
    const guessController = new GuessController(
        guessService,
        scoringService,
        guessOrchestratorService
    );

    const leaderboardsRepo = new LeaderboardsRepository();
    const leaderboardsService = new LeaderboardsService(leaderboardsRepo);
    const leaderboardsController = new LeaderboardsController(leaderboardsService);

    app.use((req, res, next) => {
        res.set('Cache-Control', 'no-store');
        next();
    });

    app.use('/', authRoutes(authController));

    app.use(
        authMiddleware.unless({
            path: [
                '/profile',
                '/friend',
                { url: /^\/profile\/[\w-]+$/ },
                { url: /^\/friend\/[\w-]+$/, method: 'GET' },
            ],
        })
    );
    app.use('/profile', profileRoutes(profileController));
    app.use('/integration', integrationRoutes(integrationController));

    const map = new Map<string, boolean>();
    app.use('/game', syncMiddleware(integrationService, map), gameRoutes());
    app.use('/guess', guessRoutes(guessController));

    app.use('/friend', friendsRoutes(friendController));

    app.use('/scoring', scoringRoutes(scoringController));

    app.use('/leaderboards', leaderboardsRoutes(leaderboardsController));

    app.use('/stats', statsRoutes(statsController));

    app.use(globalErrorMiddleware);

    return app;
};
export { env };

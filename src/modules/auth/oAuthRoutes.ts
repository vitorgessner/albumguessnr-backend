import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Profile, Strategy as SpotifyStrategy } from 'passport-spotify';
import { Strategy as LastfmStrategy } from 'passport-lastfm';
import { env } from '../../app';
import { Router, Request } from 'express';
import COOKIE_OPTIONS from './utils/COOKIE_OPTIONS';
import AuthService from './AuthService';
import authMiddleware from './middlewares/authMiddleware';

interface AuthenticatedUser {
    id: string;
    profile?: {
        username?: string;
        displayUsername?: string;
    } | null;
}

export const oAuthRoutes = (authService: AuthService) => {
    const router = Router();

    passport.use(
        new GoogleStrategy(
            {
                clientID: env.GOOGLE_CLIENT_ID,
                clientSecret: env.GOOGLE_CLIENT_SECRET,
                callbackURL: env.GOOGLE_OAUTH_REDIRECT_URL,
                scope: ['profile', 'email'],
            },
            async (accessToken, refreshToken, profile, cb) => {
                try {
                    authService.oAuthLogin(profile, cb);
                } catch (err) {
                    cb(err);
                }
            }
        )
    );

    passport.use(
        new SpotifyStrategy(
            {
                clientID: env.SPOTIFY_CLIENT_ID,
                clientSecret: env.SPOTIFY_CLIENT_SECRET,
                callbackURL: env.SPOTIFY_OAUTH_REDIRECT_URL,
                scope: [
                    'user-read-email',
                    'user-read-private',
                    'user-library-read',
                    'user-top-read',
                ],
                showDialog: true,
            },
            async (accessToken, refreshToken, expires_at, profile, cb) => {
                try {
                    return cb(null, { accessToken, refreshToken, expires_at, profile });
                } catch (err) {
                    cb(err as Error);
                }
            }
        )
    );

    passport.use(
        new LastfmStrategy(
            {
                api_key: env.API_KEY,
                secret: env.LASTFM_CLIENT_SECRET,
                callbackURL: env.LASTFM_OAUTH_REDIRECT_URL,
            },
            async (req, sessionKey, done) => {
                try {
                    return done(null, {
                        key: sessionKey.key,
                        name: sessionKey.name,
                        sub: sessionKey.subscriber,
                    });
                } catch (err) {
                    done(err as Error);
                }
            }
        )
    );

    passport.serializeUser(function (rawUser: Express.User, cb) {
        const user = rawUser as AuthenticatedUser;
        process.nextTick(function () {
            cb(null, {
                id: user.id,
                username: user.profile?.username,
                name: user.profile?.username,
            });
        });
    });

    passport.deserializeUser(function (user: Express.User | false | null, cb) {
        process.nextTick(function () {
            return cb(null, user);
        });
    });

    router.get('/login/google', passport.authenticate('google', { session: false }));

    router.get('/google/callback', (req: Request, res, next) => {
        passport.authenticate(
            'google',
            {
                failureRedirect: env.FRONTEND_URL + '/auth/login',
                failureMessage: true,
                session: false,
            },
            (err: unknown, rawUser: Express.User, info?: { message?: string }) => {
                if (err || !rawUser)
                    return res.redirect(env.FRONTEND_URL + '/auth/login?message=Auth failed');

                if (info && info.message) {
                    const errorMessage = info.message ? info.message : 'Auth failed';
                    return res.redirect(
                        `${env.FRONTEND_URL}/auth/login?message=${encodeURIComponent(errorMessage)}`
                    );
                }

                try {
                    const user = rawUser as AuthenticatedUser;
                    const { token, refresh } = authService.generateTokens(user.id);

                    const username = user.profile?.username ?? '';

                    return res
                        .status(200)
                        .cookie('token', token, COOKIE_OPTIONS(1000 * 60 * 65))
                        .cookie('refresh', refresh, COOKIE_OPTIONS(1000 * 60 * 60 * 24 * 7))
                        .redirect(env.FRONTEND_URL + `/profile/${username}/edit`);
                } catch (error) {
                    console.error('Failed to generate tokens:', error);
                    return res.redirect(env.FRONTEND_URL + '/auth/login');
                }
            }
        )(req, res, next);
    });

    router.get('/login/spotify', authMiddleware, (req: Request, res, next) => {
        const state = req.userId;

        passport.authenticate('spotify', {
            state,
        })(req, res, next);
    });

    router.get('/spotify/callback', (req: Request, res, next) =>
        passport.authenticate(
            'spotify',
            {
                failureRedirect: env.FRONTEND_URL + '/auth/login',
                failureMessage: true,
            },
            async function (
                err: unknown,
                user: {
                    accessToken: string;
                    refreshToken: string;
                    expires_at: number;
                    profile: Profile;
                },
                info?: { message?: string }
            ) {
                if (err || !user)
                    return res.redirect(env.FRONTEND_URL + '/auth/login?message=Auth failed');

                if (info && info.message) {
                    const errorMessage = info.message ? info.message : 'Auth failed';
                    return res.redirect(
                        `${env.FRONTEND_URL}/auth/login?message=${encodeURIComponent(errorMessage)}`
                    );
                }

                const userId = req.query.state;

                if (!userId) {
                    console.error('userId not found');
                    return res.redirect(env.FRONTEND_URL + '/auth/login?message=missing_user');
                }

                if (typeof userId !== 'string') {
                    console.error('userId is not valid');
                    return res.redirect(env.FRONTEND_URL + '/auth/login?message=invalid_userId');
                }

                try {
                    const response = await authService.createAccount({
                        provider: 'spotify',
                        providerAccountId: user.profile.id,
                        userId: userId,
                        username: user.profile.username,
                        accessToken: user.accessToken,
                        refreshToken: user.refreshToken,
                        displayUsername: user.profile.displayName,
                        expiresAt: new Date(
                            new Date().setSeconds(new Date().getSeconds() + user.expires_at)
                        ),
                    });

                    await authService.setMainProvider(userId, response.account.id);
                    const me = await authService.me(userId);

                    return res.redirect(
                        env.FRONTEND_URL + '/profile/' + me?.profile?.displayUsername
                    );
                } catch (error) {
                    console.error('Failed to create account: ', error);
                    return res.redirect(env.FRONTEND_URL + '/auth/login');
                }
            }
        )(req, res, next)
    );

    router.get('/login/lastfm', authMiddleware, (req: Request, res, next) => {
        passport.authenticate('lastfm')(req, res, next);
    });

    router.get('/lastfm/callback', (req, res, next) => {
        passport.authenticate(
            'lastfm',
            {
                failureRedirect: env.FRONTEND_URL + '/auth/login',
                failureMessage: true,
            },
            async (err: unknown, user: { key: string; name: string; sub: string }) => {
                if (err || !user)
                    return res.redirect(env.FRONTEND_URL + '/auth/login?message=Auth failed');

                if (!req.userId) {
                    console.error('userId not found');
                    return res.redirect(env.FRONTEND_URL + '/auth/login?message=missing_user');
                }

                if (typeof req.userId !== 'string') {
                    console.error('userId is not valid');
                    return res.redirect(env.FRONTEND_URL + '/auth/login?message=invalid_userId');
                }

                try {
                    const response = await authService.createAccount({
                        provider: 'lastfm',
                        providerAccountId: user.sub,
                        userId: req.userId,
                        username: user.name,
                        accessToken: user.key,
                        refreshToken: null,
                        displayUsername: user.name,
                        expiresAt: null,
                    });

                    await authService.setMainProvider(req.userId, response.account.id);
                    const me = await authService.me(req.userId);

                    return res.redirect(
                        env.FRONTEND_URL + '/profile/' + me?.profile?.displayUsername
                    );
                } catch (error) {
                    console.error('Failed to create account: ', error);
                    return res.redirect(env.FRONTEND_URL + '/auth/login');
                }
            }
        )(req, res, next);
    });

    return router;
};

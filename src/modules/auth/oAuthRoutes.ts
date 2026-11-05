import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as LastfmStrategy } from 'passport-lastfm';
import { env } from '../../app';
import { Router, Request } from 'express';
import COOKIE_OPTIONS from './utils/COOKIE_OPTIONS';
import AuthService from './AuthService';
import authMiddleware from './middlewares/authMiddleware';
import { optionalAuth } from './middlewares/optionalAuth';

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
                passReqToCallback: true,
            },
            async (req, accessToken, refreshToken, profile, cb) => {
                try {
                    const data = await authService.oAuthLogin(profile, req.userId);
                    if (data instanceof Error) {
                        return cb(data);
                    }

                    if ('message' in data) {
                        return cb(new Error(data.message));
                    }

                    cb(null, data);
                } catch (err) {
                    cb(err);
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

    router.get(
        '/login/google',
        optionalAuth(authService),
        passport.authenticate('google', { session: false })
    );

    router.get('/google/callback', optionalAuth(authService), (req: Request, res, next) => {
        passport.authenticate(
            'google',
            {
                failureRedirect: env.FRONTEND_URL + '/auth/login',
                failureMessage: true,
                session: false,
            },
            async (err: unknown, rawUser: Express.User, info?: { message?: string }) => {
                if (err || !rawUser) {
                    return res.redirect(env.FRONTEND_URL + '/auth/login?message=Auth failed');
                }

                if (info && info.message) {
                    const errorMessage = info.message ? info.message : 'Auth failed';
                    return res.redirect(
                        `${env.FRONTEND_URL}/auth/login?message=${encodeURIComponent(errorMessage)}`
                    );
                }

                try {
                    const user = rawUser as AuthenticatedUser;
                    const { token, refresh } = await authService.generateTokens(user.id, false);

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

    router.get('/login/lastfm', authMiddleware, (req: Request, res, next) => {
        res.cookie('lastfm_auth_userId', req.userId, {
            httpOnly: true,
            secure: env.NODE_ENV !== 'dev',
            sameSite: 'lax',
            maxAge: 1000 * 60 * 15,
        });
        passport.authenticate('lastfm')(req, res, next);
    });

    router.get('/lastfm/callback', (req, res, next) => {
        passport.authenticate(
            'lastfm',
            {
                failureRedirect: env.FRONTEND_URL + '/auth/login',
                failureMessage: true,
            },
            async (err: unknown, user: { key: string; name: string }) => {
                if (err || !user) return res.redirect(env.FRONTEND_URL + '/?message=Auth failed');

                const userId = req.cookies.lastfm_auth_userId;

                if (!userId) {
                    console.error('userId not found');
                    return res.redirect(env.FRONTEND_URL + '/?message=missing_user');
                }

                if (typeof userId !== 'string') {
                    console.error('userId is not valid');
                    return res.redirect(env.FRONTEND_URL + '/?message=invalid_userId');
                }

                res.clearCookie('lastfm_auth_userId');

                try {
                    const response = await authService.createAccount(userId, {
                        provider: 'lastfm',
                        providerAccountId: user.name,
                        userId: userId,
                        username: user.name,
                        accessToken: user.key,
                        refreshToken: null,
                        displayUsername: user.name,
                        expiresAt: null,
                    });

                    await authService.setMainProvider(userId, response.account.id);
                    const me = await authService.me(userId);

                    return res.redirect(
                        env.FRONTEND_URL +
                            '/profile/' +
                            me?.profile?.displayUsername +
                            '/edit?sync=true'
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

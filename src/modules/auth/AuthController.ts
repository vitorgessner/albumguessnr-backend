import type { Request, Response } from 'express';
import AuthService from './AuthService.js';
import COOKIE_OPTIONS from './utils/COOKIE_OPTIONS.js';
import AuthError from './errors/AuthError.js';
import type IntegrationService from '../integration/IntegrationService.js';
import { generateRandomString } from './utils/generateRandomString.js';
import QueryString from 'qs';
import { env } from '../../app.js';
import axios from '../../config/axios.js';
import { SpotifyCallbackInterface } from './types/spotifyCallback.js';
import { SpotifyUserData } from './types/SpotifyUserData.js';

class AuthController {
    private authService: AuthService;
    private integrationService: IntegrationService;
    constructor(authService: AuthService, integrationService: IntegrationService) {
        this.authService = authService;
        this.integrationService = integrationService;
    }

    getAllUsers = async (req: Request, res: Response) => {
        const users = await this.authService.getAll();

        res.status(200).json({ status: 'success', users });
    };

    getAllUsersWithProfile = async (req: Request, res: Response) => {
        const users = await this.authService.getAllWithProfile();

        res.status(200).json({ status: 'success', users });
    };

    getAllUsersWithLastfmIntegration = async (req: Request, res: Response) => {
        const users = await this.authService.getAllWithLastfmIntegration();

        res.status(200).json({ status: 'success', users });
    };

    me = async (req: Request, res: Response) => {
        if (!req.userId) throw new AuthError(401, 'Unauthorized');
        const me = await this.authService.me(req.userId);

        res.status(200).json({ status: 'success', user: me });
    };

    resendVerification = async (req: Request, res: Response) => {
        this.authService.resendEmail(req.body.email);

        res.json({ status: 'success', message: 'Verify your email' });
    };

    refresh = async (req: Request, res: Response) => {
        const { refresh } = req.cookies;
        if (!refresh) throw new AuthError(401, 'No refresh token available');
        const { accessToken, refresh: refreshToken } = await this.authService.refresh(refresh);

        res.status(200)
            .cookie('token', accessToken, COOKIE_OPTIONS(1000 * 60 * 65))
            .cookie('refresh', refreshToken, COOKIE_OPTIONS(1000 * 60 * 60 * 24 * 7))
            .json({ status: 'success', message: 'Authorization refreshed' });
    };

    spotify = async (req: Request, res: Response) => {
        const state = generateRandomString(16);
        const scope = 'user-read-email user-library-read user-top-read';

        res.redirect(
            'https://accounts.spotify.com/authorize?' +
                QueryString.stringify({
                    response_type: 'code',
                    client_id: env.SPOTIFY_CLIENT_ID,
                    scope,
                    redirect_uri: env.SPOTIFY_OAUTH_REDIRECT_URL,
                    state,
                })
        );
    };

    callback = async (req: Request, res: Response) => {
        const code = req.query.code || null;
        const state = req.query.state || null;

        if (state === null) {
            return res.redirect(
                '/' +
                    QueryString.stringify({
                        error: 'state_mismatch',
                    })
            );
        }

        const { data } = await axios.post<SpotifyCallbackInterface>(
            'https://accounts.spotify.com/api/token',
            {
                code,
                redirect_uri: env.SPOTIFY_OAUTH_REDIRECT_URL,
                grant_type: 'authorization_code',
            },
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization:
                        'Basic ' +
                        Buffer.from(
                            env.SPOTIFY_CLIENT_ID + ':' + env.SPOTIFY_CLIENT_SECRET
                        ).toString('base64'),
                },
            }
        );

        const { access_token, refresh_token, expires_in } = data;

        const { data: account } = await axios.get<SpotifyUserData>(
            'https://api.spotify.com/v1/me',
            {
                headers: {
                    Authorization: 'Bearer ' + access_token,
                },
            }
        );

        const { user } = await this.authService.register(account.email);

        const newAccount = {
            provider: 'SPOTIFY',
            providerAccountId: account.account_id,
            access_token,
            refresh_token,
            expires_in,
            userId: user.id,
        };
        await this.authService.createAccount(newAccount);

        const { token, refresh } = this.authService.generateTokens(user.id);

        return res
            .status(200)
            .cookie('token', token, COOKIE_OPTIONS(1000 * 60 * 65))
            .cookie('refresh', refresh, COOKIE_OPTIONS(1000 * 60 * 60 * 24 * 7))
            .redirect(env.FRONTEND_URL + `/profile/${user.profile?.username}/edit`);
    };

    login = async (req: Request, res: Response) => {
        const { email, password } = req.body;
        const { token, refresh, username } = await this.authService.login(email, password);

        return res
            .status(200)
            .cookie('token', token, COOKIE_OPTIONS(1000 * 60 * 65))
            .cookie('refresh', refresh, COOKIE_OPTIONS(1000 * 60 * 60 * 24 * 7))
            .json({ status: 'success', message: 'Login successful', username });
    };

    logout = async (req: Request, res: Response) => {
        const { refresh } = req.cookies;
        await this.authService.deleteRefreshToken(refresh);

        return res
            .status(200)
            .clearCookie('token', COOKIE_OPTIONS(1000 * 60 * 65))
            .clearCookie('refresh', COOKIE_OPTIONS(1000 * 60 * 60 * 24 * 7))
            .json({ status: 'success', message: 'logged off' });
    };

    create = async (req: Request, res: Response) => {
        const { email, password } = req.body;
        await this.authService.register(email, password);

        return res.status(200).json({ status: 'success', message: 'Verify your email' });
    };

    verifyUser = async (req: Request, res: Response) => {
        const { userVerificationToken } = req.params;
        if (!userVerificationToken || typeof userVerificationToken !== 'string') {
            throw new AuthError(500, 'Invalid verification token format');
        }

        const { username, token, refresh, id } =
            await this.authService.verifyEmail(userVerificationToken);

        await this.integrationService.connectLastfmUser(undefined, id);

        return res
            .cookie('token', token, COOKIE_OPTIONS(1000 * 60 * 65))
            .cookie('refresh', refresh, COOKIE_OPTIONS(1000 * 60 * 60 * 24 * 7))
            .status(200)
            .json({ status: 'success', message: 'Valid token', username });
    };

    forgot = async (req: Request, res: Response) => {
        await this.authService.forgot(req.body.email);

        return res.json({
            status: 'success',
            message: 'If your email exists, password reset instructions were sent',
        });
    };

    changePassword = async (req: Request, res: Response) => {
        const { passwordResetToken } = req.params;
        await this.authService.editPassword(passwordResetToken as string, req.body.password);

        return res
            .status(200)
            .json({ status: 'success', message: 'Password changed, you may login now' });
    };
}

export default AuthController;

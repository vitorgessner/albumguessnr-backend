import type { Request, Response } from 'express';
import AuthService from './AuthService.js';
import COOKIE_OPTIONS from './utils/COOKIE_OPTIONS.js';
import AuthError from './errors/AuthError.js';
import type IntegrationService from '../integration/IntegrationService.js';

class AuthController {
    private authService: AuthService;
    private integrationService: IntegrationService;
    constructor(authService: AuthService, integrationService: IntegrationService) {
        this.authService = authService;
        this.integrationService = integrationService;
    }

    getAllUsersWithProfile = async (req: Request, res: Response) => {
        const users = await this.authService.getAllWithProfile();

        res.status(200).json({ status: 'success', users });
    };

    me = async (req: Request, res: Response) => {
        if (!req.userId) throw new AuthError(401, 'Unauthorized');
        const me = await this.authService.me(req.userId);

        res.status(200).json({ status: 'success', user: me });
    };

    getGuest = async (req: Request, res: Response) => {
        if (!req.cookies.token) {
            throw new AuthError(404, 'Token id not found');
        }

        const guest = await this.authService.getGuest(req.cookies.token);

        return res.status(200).json({ status: 'success', message: 'Guest found', guest });
    };

    resendVerification = async (req: Request, res: Response) => {
        this.authService.resendEmail(req.body.email);

        return res.json({ status: 'success', message: 'Verify your email' });
    };

    refresh = async (req: Request, res: Response) => {
        const { refresh } = req.cookies;
        if (!refresh) throw new AuthError(401, 'No refresh token available');
        const { accessToken, refresh: refreshToken } = await this.authService.refresh(refresh);

        return res
            .status(200)
            .cookie('token', accessToken, COOKIE_OPTIONS(1000 * 30))
            .cookie('refresh', refreshToken, COOKIE_OPTIONS(1000 * 60 * 60 * 24 * 7))
            .json({ status: 'success', message: 'Authorization refreshed' });
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

    createGuest = async (req: Request, res: Response) => {
        const { user, refresh, token } = await this.authService.createGuest();

        return res
            .status(201)
            .cookie('token', token, COOKIE_OPTIONS(1000 * 30))
            .cookie('refresh', refresh, COOKIE_OPTIONS(1000 * 60 * 60 * 24 * 30))
            .json({ status: 'success', message: 'guest created', guest: user });
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
        const userId = req.userId;
        const { email, password } = req.body;
        await this.authService.register(email, password, userId);

        return res.status(200).json({ status: 'success', message: 'Verify your email' });
    };

    verifyUser = async (req: Request, res: Response) => {
        const { userVerificationToken } = req.params;
        if (!userVerificationToken || typeof userVerificationToken !== 'string') {
            throw new AuthError(500, 'Invalid verification token format');
        }

        const { username, token, refresh } =
            await this.authService.verifyEmail(userVerificationToken);

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

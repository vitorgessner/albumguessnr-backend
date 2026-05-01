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
        const { accessToken, refresh: refreshToken } = await this.authService.refresh(refresh);

        res.status(200)
            .cookie('token', accessToken, COOKIE_OPTIONS(1000 * 60 * 60))
            .cookie('refresh', refreshToken, COOKIE_OPTIONS(1000 * 60 * 60 * 24 * 7))
            .json({ status: 'success', message: 'Authorization refreshed' });
    };

    login = async (req: Request, res: Response) => {
        const { email, password } = req.body;
        const { token, refresh } = await this.authService.login(email, password);

        return res
            .status(200)
            .cookie('token', token, COOKIE_OPTIONS(1000 * 60 * 60))
            .cookie('refresh', refresh, COOKIE_OPTIONS(1000 * 60 * 60 * 24 * 7))
            .json({ status: 'success', message: 'Login successful' });
    };

    logout = async (req: Request, res: Response) => {
        const { refresh } = req.cookies;
        await this.authService.deleteRefreshToken(refresh);

        return res
            .status(200)
            .clearCookie('token', COOKIE_OPTIONS(1000 * 60 * 60))
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
        const { username, token, refresh, id } = await this.authService.verifyEmail(
            userVerificationToken as string
        );
        try {
            await this.integrationService.connectLastfmUser(undefined, id);
        } catch (err) {
            console.log(err);
        }

        return res
            .cookie('token', token, COOKIE_OPTIONS(1000 * 60 * 60))
            .cookie('refresh', refresh, COOKIE_OPTIONS(1000 * 60 * 60 * 24 * 7))
            .status(200)
            .json({ status: 'success', message: 'Valid token', username });
    };

    forgot = async (req: Request, res: Response) => {
        this.authService.forgot(req.body.email);

        res.json({ status: 'success', message: 'Verify your email' });
    };

    changePassword = async (req: Request, res: Response) => {
        const { username } = req.params;
        await this.authService.editPassword(username as string, req.body.password);

        return res
            .status(200)
            .json({ status: 'success', message: 'Password changed, you may login now' });
    };
}

export default AuthController;

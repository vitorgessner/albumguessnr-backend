import type { Request, Response } from 'express';
import AuthService from './AuthService.js';
import COOKIE_OPTIONS from './utils/COOKIE_OPTIONS.js';
import AuthError from './errors/AuthError.js';

class AuthController {
    private authService: AuthService;
    constructor(authService: AuthService) {
        this.authService = authService;
    }

    getAllUsers = async (req: Request, res: Response) => {
        const users = await this.authService.getAll();

        res.status(200).json({ status: 'success', users });
    };

    getAllUsersWithProfile = async (req: Request, res: Response) => {
        const users = await this.authService.getAllWithProfile();

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

    login = async (req: Request, res: Response) => {
        const { email, password } = req.body;
        const token = await this.authService.login(email, password);

        return res
            .status(200)
            .cookie('token', token, COOKIE_OPTIONS)
            .json({ status: 'success', message: 'Login successful' });
    };

    logout = async (req: Request, res: Response) => {
        return res
            .status(200)
            .clearCookie('token', COOKIE_OPTIONS)
            .json({ status: 'success', message: 'logged off' });
    };

    create = async (req: Request, res: Response) => {
        const { email, password } = req.body;
        await this.authService.register(email, password);

        return res.status(200).json({ status: 'success', message: 'Verify your email' });
    };

    verifyUser = async (req: Request, res: Response) => {
        const { userVerificationToken } = req.params;
        const { userId, token } = await this.authService.verifyEmail(
            userVerificationToken as string
        );

        return res
            .cookie('token', token, COOKIE_OPTIONS)
            .redirect(`${process.env.FRONTEND_URL!}/${userId}/profile/edit`);
    };
}

export default AuthController;

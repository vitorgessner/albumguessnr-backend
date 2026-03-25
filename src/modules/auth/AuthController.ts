import type { Request, Response } from 'express';
import AuthService from './AuthService.js';

class AuthController {
    private authService: AuthService;
    constructor(authService: AuthService) {
        this.authService = authService;
    }

    getAllUsers = async (req: Request, res: Response) => {
        const users = await this.authService.getAll();

        res.status(200).json({ status: 'sucess', users });
    };

    login = async (req: Request, res: Response) => {
        const { email, password } = req.body;
        const { validUser, token } = await this.authService.login(email, password);

        return res
            .status(200)
            .json({ status: 'success', id: validUser.id, email: validUser.email, token });
    };

    create = async (req: Request, res: Response) => {
        const { email, password } = req.body;
        const { user, token } = await this.authService.create(email, password);

        return res.status(201).json({ status: 'success', id: user.id, email: user.email, token });
    };
}

export default AuthController;

import type { NextFunction, Request, Response } from 'express';
import AuthService from '../../auth/AuthService';
import COOKIE_OPTIONS from '../../auth/utils/COOKIE_OPTIONS.js';

export const guestMiddleware = (authService: AuthService) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const userId = req.userId;
        if (!userId) {
            const { user, token, refresh } = await authService.createGuest();
            req.userId = user.id;
            res.cookie('token', token, COOKIE_OPTIONS(1000 * 60 * 65)).cookie(
                'refresh',
                refresh,
                COOKIE_OPTIONS(1000 * 60 * 60 * 24 * 30)
            );
            next();
        }
        next();
    };
};

import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../../shared/config/env';
import AuthService from '../AuthService';
import COOKIE_OPTIONS from '../utils/COOKIE_OPTIONS';

export const optionalAuth = (authService: AuthService) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const token = req.cookies.token;
        const refresh = req.cookies.refresh;
        const secret = env.SECRET_JWT;
        if (!secret) {
            console.log('secret is missing');
            return next();
        }

        try {
            const decoded = jwt.verify(token, secret) as jwt.JwtPayload;
            req.userId = decoded.id;
            req.isGuest = decoded.isGuest;
        } catch {
            if (refresh) {
                try {
                    const { accessToken, refresh: refreshToken } =
                        await authService.refresh(refresh);
                    const decoded = jwt.verify(accessToken, secret) as jwt.JwtPayload;
                    req.userId = decoded.id;
                    req.isGuest = decoded.isGuest;
                    res.cookie('token', accessToken, COOKIE_OPTIONS(1000 * 60 * 65)).cookie(
                        'refresh',
                        refreshToken,
                        COOKIE_OPTIONS(1000 * 60 * 60 * 24 * 30)
                    );
                    return next();
                } catch {
                    return next();
                }
            }
            return next();
        }
        return next();
    };
};

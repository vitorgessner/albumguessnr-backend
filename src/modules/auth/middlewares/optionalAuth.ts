import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../../shared/config/env';

export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.token;
    if (!token) {
        return next();
    }

    const secret = env.SECRET_JWT;
    if (!secret) {
        return next();
    }

    try {
        const decoded = jwt.verify(token, secret) as jwt.JwtPayload;
        req.userId = decoded.id;
    } catch {
        return next();
    }

    next();
};

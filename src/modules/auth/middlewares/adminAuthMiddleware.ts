import type { NextFunction, Request, Response } from 'express';
import AuthError from '../errors/AuthError.js';
import * as crypto from 'node:crypto';
import { env } from '../../../app.js';

export const adminAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        throw new AuthError(401, 'Authorization header was not provided');
    }

    const token = authorization.split('Bearer')[1]?.trim();
    if (!token) {
        throw new AuthError(404, 'Token was not provided');
    }

    const hash1 = crypto.createHash('sha256').update(token).digest();
    const hash2 = crypto.createHash('sha256').update(env.CRON_API_KEY).digest();
    const isEqual = crypto.timingSafeEqual(hash1, hash2);

    if (!isEqual) {
        throw new AuthError(403, 'You do not have permission to call this route');
    }

    next();
};

import type { NextFunction, Request, Response } from 'express';
import AuthError from '../errors/AuthError.js';

export const requireFullAccountMiddleware = (req: Request, res: Response, next: NextFunction) => {
    if (req.isGuest) {
        throw new AuthError(403, 'User has not a full account');
    }

    next();
};

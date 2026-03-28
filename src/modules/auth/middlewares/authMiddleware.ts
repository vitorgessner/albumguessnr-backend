import type { NextFunction, Request, Response } from 'express';
import AuthError from '../errors/AuthError.js';
import jwt from 'jsonwebtoken';

declare global {
    namespace Express {
        interface Request {
            userId?: string;
        }
    }
}

const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.token;
    if (!token) throw new AuthError(401, 'Invalid token format');

    const secret = process.env.SECRET_JWT;
    if (!secret) throw new AuthError(500, 'JWT secret key is not defined');

    try {
        const decoded = jwt.verify(token, secret) as jwt.JwtPayload;
        req.userId = decoded.id;
    } catch {
        throw new AuthError(401, 'Invalid or expired token');
    }

    next();
};

export default authMiddleware;

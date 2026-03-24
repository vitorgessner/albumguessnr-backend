import type { NextFunction, Request, Response } from 'express';
import ValidationError from '../errors/ValidationError.js';
import AuthError from '../../modules/auth/errors/AuthError.js';

const globalErrorMiddleware = (err: Error, req: Request, res: Response, next: NextFunction) => {
    let statusCode = 500;
    let message = 'Something went wrong';
    let name = 'Server Error';

    if (err instanceof ValidationError) {
        statusCode = err.statusCode;
        message = err.message;
        name = err.name;
    }

    if (err instanceof AuthError) {
        statusCode = err.statusCode;
        message = err.message;
        name = err.name;
    }

    res.status(statusCode).json({ status: 'failed', name, statusCode, message });
};

export default globalErrorMiddleware;

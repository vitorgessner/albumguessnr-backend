import type { NextFunction, Request, Response } from 'express';
import ValidationError from '../errors/ValidationError.js';
import AuthError from '../../modules/auth/errors/AuthError.js';
import { PrismaClientValidationError } from '../../generated/prisma/internal/prismaNamespace.js';

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

    if (err instanceof PrismaClientValidationError) {
        statusCode = 400;
        message = err.message;
        name = err.name;
    }

    console.log(err);
    res.status(statusCode).json({ status: 'failed', name, statusCode, message });
};

export default globalErrorMiddleware;

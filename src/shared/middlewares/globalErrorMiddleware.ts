import type { NextFunction, Request, Response } from 'express';
import ValidationError from '../errors/ValidationError.js';
import AuthError from '../../modules/auth/errors/AuthError.js';
import {
    PrismaClientKnownRequestError,
    PrismaClientValidationError,
} from '../../generated/prisma/internal/prismaNamespace.js';
import FriendError from '../../modules/friends/errors/FriendError.js';
import IntegrationError from '../../modules/integration/errors/IntegrationError.js';
import { logger } from '../../config/logger.js';
import { sanitizeError } from '../utils/sanitizeCause.js';

const globalErrorMiddleware = (err: Error, req: Request, res: Response, _: NextFunction) => {
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

    if (err instanceof IntegrationError) {
        statusCode = err.statusCode;
        message = err.message;
        name = err.name;
    }

    if (err instanceof FriendError) {
        statusCode = err.statusCode;
        message = err.message;
        name = err.name;
    }

    if (err instanceof PrismaClientValidationError) {
        statusCode = 400;
        message = 'Bad request';
        name = err.name;
    }

    if (err instanceof PrismaClientKnownRequestError) {
        switch (err.code) {
            case 'P2002':
                statusCode = 409;
                message = 'Resource already exists';
                name = 'UniqueConstraintError';
                break;
            case 'P2025':
                statusCode = 404;
                message = 'Resource not found';
                name = 'NotFoundError';
                break;
            case 'P2003':
                statusCode = 400;
                message = 'Related resource not found';
                name = 'ForeignKeyError';
                break;
        }
    }

    const sanitizedError = sanitizeError(err);

    logger.error(err instanceof Error ? err.message : String(err), {
        ...sanitizedError,
        method: req.method,
        path: req.path,
        meta: err instanceof PrismaClientKnownRequestError ? err.meta : undefined,
        stack: err.stack,
    });
    res.status(statusCode).json({ status: 'failed', name, statusCode, message });
};

export default globalErrorMiddleware;

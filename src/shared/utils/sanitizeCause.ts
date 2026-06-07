import {
    PrismaClientInitializationError,
    PrismaClientKnownRequestError,
    PrismaClientUnknownRequestError,
} from '@prisma/client/runtime/client';
import { AxiosError } from 'axios';
import { ZodError } from 'zod';

export const sanitizeError = (err: unknown) => {
    if (err instanceof AxiosError) {
        return {
            message: err.message,
            status: err.response?.status,
            params: err.config?.params,
            data: err.response?.data,
        };
    }
    if (err instanceof ZodError) {
        return {
            message: 'Validation error',
            issues: err.issues.map((issue) => ({
                path: issue.path.length > 0 ? issue.path.join('.') : 'root',
                message: issue.message,
                code: issue.code,
            })),
        };
    }
    if (err instanceof PrismaClientKnownRequestError) {
        return {
            message: err.message,
            code: err.code,
            meta: err.meta,
        };
    }
    if (err instanceof PrismaClientUnknownRequestError) {
        return {
            message: err.message,
        };
    }
    if (err instanceof PrismaClientInitializationError) {
        return {
            message: err.message,
            errorCode: err.errorCode,
        };
    }
    return { message: String(err) };
};

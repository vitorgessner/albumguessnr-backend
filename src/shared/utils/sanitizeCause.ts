import { AxiosError } from 'axios';
import { ZodError } from 'zod';
import {
    PrismaClientInitializationError,
    PrismaClientKnownRequestError,
    PrismaClientUnknownRequestError,
} from '@prisma/client/runtime/client';

type SanitizedError = {
    message: string;
    status?: number | undefined;
    params?: Record<string, string> | undefined;
    data?: string | undefined;
    issues?: Array<{ path: string; message: string; code: string }> | undefined;
    code?: string | undefined;
    meta?: Record<string, string | number | boolean | null> | undefined;
    errorCode?: string | undefined;
};

export const sanitizeError = (err: unknown): SanitizedError => {
    if (err instanceof AxiosError) {
        return {
            message: err.message,
            status: err.response?.status,
            params: err.config?.params,
            data: JSON.stringify(err.response?.data),
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
            meta: err.meta as Record<string, string | number | boolean | null> | undefined,
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

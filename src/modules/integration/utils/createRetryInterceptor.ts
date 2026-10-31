import { AxiosError } from 'axios';
import { logger } from '../../../config/logger/logger';
import IntegrationError from '../errors/IntegrationError';

declare module 'axios' {
    export interface InternalAxiosRequestConfig {
        _retryCount?: number;
    }
}

const retryable = [429, 503];

export async function createRetryInterceptor(
    error: AxiosError,
    serviceName: string,
    fallbackWaitMs: number,
    attempt: number
) {
    const config = error.config;

    if (!config) throw error;

    if (!retryable.includes(error.response?.status ?? 500)) throw error;

    if (error.status === 429) {
        logger.warn(new IntegrationError(429, `Rate limit exceeded for ${serviceName}`));
    }

    if (error.status === 503) {
        logger.warn(new IntegrationError(503, `Service ${serviceName} unavailable`));
    }

    const retryAfterHeader = error.response?.headers['retry-after'];
    const waitMs = retryAfterHeader
        ? parseFloat(retryAfterHeader) * 1000 +
          Math.random() * (parseFloat(retryAfterHeader) * 1000)
        : fallbackWaitMs * 2 ** attempt + Math.random() * (fallbackWaitMs * 2 ** attempt);

    await new Promise((resolve) => setTimeout(resolve, waitMs));
}

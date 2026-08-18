import { AxiosError } from 'axios';
import { logger } from '../../../config/logger/logger';
import IntegrationError from '../errors/IntegrationError';

declare module 'axios' {
    export interface InternalAxiosRequestConfig {
        _retryCount?: number;
    }
}

const MAX_RETRIES = 3;
const retryable = [429, 503];

export async function createRetryInterceptor(
    error: AxiosError,
    serviceName: string,
    fallbackWaitMs: number
) {
    const config = error.config;

    if (!config) throw error;

    if (!retryable.includes(error.response?.status ?? 500)) throw error;

    if ((config._retryCount ?? 0) >= MAX_RETRIES) throw error;

    if (error.status === 429) {
        logger.warn(new IntegrationError(429, `Rate limit exceeded for ${serviceName}`));
    }

    if (error.status === 503) {
        logger.warn(new IntegrationError(503, `Service ${serviceName} unavailable`));
    }

    config._retryCount = (config._retryCount ?? 0) + 1;

    const retryAfterHeader = error.response?.headers['retry-after'];
    const waitMs = retryAfterHeader
        ? parseFloat(retryAfterHeader) * 1000
        : fallbackWaitMs * 2 ** config._retryCount;

    await new Promise((resolve) => setTimeout(resolve, waitMs));
}

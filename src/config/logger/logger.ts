import winston from 'winston';
import { env } from '../../shared/config/env';
import { devFormat, isDev, levels, prodFormat, transports } from './config';

export const logger = winston.createLogger({
    levels,
    level: env.LOG_LEVEL || 'info',
    format: isDev ? devFormat : prodFormat,
    transports,
    defaultMeta: { env: env.NODE_ENV, service: 'albumguessnr-backend' },
});

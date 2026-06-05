import winston from 'winston';
import { env } from '../shared/config/env';

const levels = {
    fatal: 0,
    error: 1,
    warning: 2,
    info: 3,
    http: 4,
    debug: 5,
};

const isDev = env.NODE_ENV === 'dev';

const devFormat = winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.prettyPrint()
);

const prodFormat = winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.json()
);

const transports = isDev
    ? [
          new winston.transports.Console(),
          new winston.transports.File({ level: 'error', filename: 'logs/error.log' }),
          new winston.transports.File({ level: 'info', filename: 'logs/combined.log' }),
      ]
    : [
          new winston.transports.File({ level: 'error', filename: 'logs/error.log' }),
          new winston.transports.File({ level: 'info', filename: 'logs/combined.log' }),
      ];

export const logger = winston.createLogger({
    levels,
    level: env.LOG_LEVEL || 'info',
    format: isDev ? devFormat : prodFormat,
    transports,
    defaultMeta: { env: env.NODE_ENV, service: 'albumguessnr-backend' },
});

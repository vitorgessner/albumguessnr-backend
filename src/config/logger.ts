import winston from 'winston';
import { env } from '../shared/config/env';

const levels = {
    error: 0,
    warning: 1,
    info: 2,
    http: 3,
    debug: 4,
};

export const logger = winston.createLogger({
    levels,
    level: env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.prettyPrint()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ level: 'error', filename: 'error.log' }),
    ],
});

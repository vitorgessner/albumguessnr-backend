import winston from 'winston';
import { devFormat, levels, prodFormat } from './config';

export const initialLogger = winston.createLogger({
    levels,
    level: 'info',
    format: process.env.NODE_ENV === 'dev' ? devFormat : prodFormat,
    transports: [new winston.transports.Console()],
});

import winston from 'winston';

export const levels = {
    fatal: 0,
    error: 1,
    warn: 2,
    info: 3,
    http: 4,
    debug: 5,
};

export const isDev = process.env.NODE_ENV === 'dev';

export const devFormat = winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.prettyPrint()
);

export const prodFormat = winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.json()
);

export const transports = isDev
    ? [
          new winston.transports.Console(),
          new winston.transports.File({ level: 'error', filename: 'logs/error.log' }),
          new winston.transports.File({ level: 'info', filename: 'logs/combined.log' }),
      ]
    : [
          new winston.transports.Console(),
          new winston.transports.File({ level: 'error', filename: 'logs/error.log' }),
          new winston.transports.File({ level: 'info', filename: 'logs/combined.log' }),
      ];

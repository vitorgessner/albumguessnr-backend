import { Request, Response } from 'express';
import { logger } from '../../config/logger/logger.js';
import { prisma } from '../../config/prisma.js';
import { sanitizeError } from './sanitizeCause.js';

export const health = async (req: Request, res: Response) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        logger.info('Health check passed');
        res.status(200).json({
            status: 'healthy',
            database: 'connected',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        logger.error('Health check failed', { cause: sanitizeError(err) });
        res.status(503).json({
            status: 'unhealthy',
            database: 'disconnected',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
        });
    }
};

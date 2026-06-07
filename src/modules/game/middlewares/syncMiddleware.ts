import type { NextFunction, Request, Response } from 'express';
import IntegrationError from '../../integration/errors/IntegrationError.js';
import type IntegrationService from '../../integration/IntegrationService.js';
import AuthError from '../../auth/errors/AuthError.js';
import { logger } from '../../../config/logger/logger.js';

const syncMiddleware = (integrationService: IntegrationService, map: Map<string, boolean>) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const userId = req.userId;
        if (!userId) throw new AuthError(401, 'Unauthorized');

        const lastfmUsername = await integrationService
            .getLastfmUserByUserId(userId)
            .then((response) => response?.user.lastfmIntegration?.lastfmUsername);
        if (!lastfmUsername) throw new IntegrationError(404, 'Lastfm username not found');

        const stats = await integrationService.getLastSyncedStats(lastfmUsername);
        const lastSyncedAt = stats?.lastSyncedAt.getTime() ?? Date.now();

        if (map.get(userId) || Date.now() - lastSyncedAt < 1000 * 60 * 60 * 24) {
            logger.info('Skipping albums syncing', { requestId: req.userId });
            return next();
        }

        logger.info('Albums sync started', { requestId: req.userId });
        map.set(userId, true);
        integrationService
            .fetchUserAlbums(userId, lastfmUsername, () => map.set(userId, false))
            .catch((err) => logger.error(err, { context: 'fetchUserAlbums fire-and-forget' }));

        next();
    };
};

export default syncMiddleware;

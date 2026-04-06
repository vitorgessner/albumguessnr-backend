import type { NextFunction, Request, Response } from 'express';
import IntegrationError from '../../integration/errors/IntegrationError.js';
import type IntegrationService from '../../integration/IntegrationService.js';
import AuthError from '../../auth/errors/AuthError.js';

const syncMiddleware = (integrationService: IntegrationService) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const userId = req.userId;
        if (!userId) throw new AuthError(401, 'Unauthorized');

        const lastfmUsername = await integrationService
            .getLastfmUserByUserId(userId)
            .then((response) => response?.lastfmIntegration?.lastfmUsername);
        if (!lastfmUsername) throw new IntegrationError(404, 'Lastfm username not found');

        const stats = await integrationService.getLastSyncedStats(lastfmUsername);
        const lastSyncedAt = stats?.lastSyncedAt.getTime() ?? Date.now();

        if (stats?.lastPageSynced === 0 || Date.now() - lastSyncedAt >= 1000 * 60 * 60 * 24) {
            integrationService.fetchUserAlbums(lastfmUsername);
        }

        next();
    };
};

export default syncMiddleware;

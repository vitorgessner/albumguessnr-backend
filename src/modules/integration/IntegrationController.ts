import type { Request, Response } from 'express';
import type IntegrationService from './IntegrationService.js';
import AuthError from '../auth/errors/AuthError.js';

class IntegrationController {
    private integrationService: IntegrationService;
    private excludeCache = new Map<string, string[]>();
    constructor(integrationService: IntegrationService) {
        this.integrationService = integrationService;
    }

    getAlbums = async (req: Request, res: Response) => {
        const userId = req.userId;
        if (!userId) throw new AuthError(401, 'Unauthorized');

        const oldExcludeIds = this.excludeCache.get(userId) || [];

        const response = await this.integrationService.getAlbums(userId, 25, oldExcludeIds);
        const excludeIds = response.map((album) => album.albumId);
        this.excludeCache.set(userId, [...oldExcludeIds, ...excludeIds]);

        res.status(200).json({
            status: 'success',
            albums: response,
            excludeIds,
        });
    };
}

export default IntegrationController;

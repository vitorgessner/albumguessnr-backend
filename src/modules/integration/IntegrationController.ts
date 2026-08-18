import type { Request, Response } from 'express';
import type IntegrationService from './IntegrationService.js';
import AuthError from '../auth/errors/AuthError.js';

class IntegrationController {
    private integrationService: IntegrationService;
    constructor(integrationService: IntegrationService) {
        this.integrationService = integrationService;
    }

    getAlbums = async (req: Request, res: Response) => {
        const userId = req.userId;
        if (!userId) throw new AuthError(401, 'Unauthorized');

        const response = await this.integrationService.getAlbums(userId);

        res.status(200).json({
            status: 'success',
            albums: response,
        });
    };
}

export default IntegrationController;

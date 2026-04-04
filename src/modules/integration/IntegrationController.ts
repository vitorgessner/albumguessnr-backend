import type { Request, Response } from 'express';
import type IntegrationService from './IntegrationService.js';

class IntegrationController {
    private integrationService: IntegrationService;
    constructor(integrationService: IntegrationService) {
        this.integrationService = integrationService;
    }

    createOrConnectLasfmUser = async (req: Request, res: Response) => {
        const { lastfmUsername } = req.body;
        const userId = req.userId;

        const response = await this.integrationService.connectLastfmUser(lastfmUsername, userId);
        if (response.status === 'success') res.status(200).json({ message: response.message });
    };

    fetchUserAlbums = async (req: Request, res: Response) => {
        const { lastfmUsername } = req.params;

        await this.integrationService.fetchUserAlbums(lastfmUsername as string);

        res.status(200).json({ status: 'success', message: 'fetched' });
    };
}

export default IntegrationController;

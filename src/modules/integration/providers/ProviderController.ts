import { Request, Response } from 'express';
import AuthError from '../../auth/errors/AuthError';
import { ProviderService } from './ProviderService';

export class ProviderController {
    constructor(private providerService: ProviderService) {}

    deleteSpotify = async (req: Request, res: Response) => {
        const id = req.userId;
        if (!id) {
            throw new AuthError(401, 'User is not logged in');
        }

        const providers = await this.providerService.findAllUserProviders(id);
        if (!providers || providers.length < 1) {
            throw new AuthError(404, 'User has not an account connected');
        }

        const spotifyProvider = providers.find((account) => account.provider === 'spotify');
        if (!spotifyProvider) {
            throw new AuthError(404, 'User has not an spotify account connected');
        }

        await this.providerService.deleteAccount(
            spotifyProvider.provider,
            spotifyProvider.providerAccountId
        );

        return res.json({ status: 'success', message: 'Provider deleted' });
    };

    deleteLastfm = async (req: Request, res: Response) => {
        const id = req.userId;
        if (!id) {
            throw new AuthError(401, 'User is not logged in');
        }

        const providers = await this.providerService.findAllUserProviders(id);
        if (!providers || providers.length < 1) {
            throw new AuthError(404, 'User has not an account connected');
        }

        const lastfmProvider = providers.find((account) => account.provider === 'lastfm');
        if (!lastfmProvider) {
            throw new AuthError(404, 'User has not an lastfm account connected');
        }

        await this.providerService.deleteAccount(
            lastfmProvider.provider,
            lastfmProvider.providerAccountId
        );

        return res.json({ status: 'success', message: 'Provider deleted' });
    };
}

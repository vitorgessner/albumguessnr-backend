import { Request, Response } from 'express';
import AuthError from '../../auth/errors/AuthError';
import { ProviderService } from './ProviderService';

export class ProviderController {
    constructor(private providerService: ProviderService) {}

    deleteLastfm = async (req: Request, res: Response) => {
        const id = req.userId;
        if (!id) {
            throw new AuthError(401, 'User is not logged in');
        }

        const providers = await this.providerService.findAllUserProviders(id);

        const lastfmProvider = providers.find((account) => account.provider === 'lastfm');
        const spotifyProvider = providers.find((account) => account.provider === 'spotify');

        if (!lastfmProvider) {
            throw new AuthError(404, 'User has not an lastfm account connected');
        }

        if (spotifyProvider) {
            await this.providerService.setMainProvider(id, spotifyProvider.id);
        }

        await this.providerService.deleteAccount(
            lastfmProvider.provider,
            lastfmProvider.providerAccountId
        );

        await this.providerService.deleteUserAlbumFamiliarities(id);

        return res.json({ status: 'success', message: 'Provider deleted' });
    };
}

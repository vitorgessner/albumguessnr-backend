import { Request, Response } from 'express';
import AuthError from '../../auth/errors/AuthError';
import AuthService from '../../auth/AuthService';
import { ProviderService } from './ProviderService';

export class ProviderController {
    constructor(
        private providerService: ProviderService,
        private authService: AuthService
    ) {}

    deleteSpotify = async (req: Request, res: Response) => {
        const id = req.userId;
        if (!id) {
            throw new AuthError(401, 'User is not logged in');
        }

        const mainProvider = await this.authService.hasMainProvider(id);
        if (!mainProvider) {
            throw new AuthError(404, 'User has not an account connected on this provider');
        }

        await this.providerService.deleteAccount(
            mainProvider.provider,
            mainProvider.providerAccountId
        );

        return res.json({ status: 'success', message: 'Provider deleted' });
    };
}

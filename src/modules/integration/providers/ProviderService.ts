import AuthError from '../../auth/errors/AuthError';
import { ProviderRepository } from './ProviderRepository';

export class ProviderService {
    constructor(private providerRepo: ProviderRepository) {}

    hasMainProvider = async (userId: string) => {
        const mainProvider = await this.providerRepo.findMainProvider(userId);
        if (!mainProvider) return null;

        const mainAccount = mainProvider.mainAccount;
        if (!mainAccount) return null;

        return mainAccount;
    };

    deleteAccount = async (provider: string, providerAccountId: string) => {
        if (!provider || !providerAccountId) {
            throw new AuthError(400, 'Provider was not provided');
        }

        await this.providerRepo.deleteAccount(provider, providerAccountId);
    };
}

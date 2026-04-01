import type IntegrationRepository from './IntegrationRepository.js';
import type AlbumRepository from '../album/AlbumRepository.js';
import AuthError from '../auth/errors/AuthError.js';
import ValidationError from '../../shared/errors/ValidationError.js';
import IntegrationError from './errors/IntegrationError.js';

class IntegrationService {
    private integrationRepo: IntegrationRepository;
    private albumRepo: AlbumRepository;
    constructor(integrationRepo: IntegrationRepository, albumRepo: AlbumRepository) {
        this.integrationRepo = integrationRepo;
        this.albumRepo = albumRepo;
    }

    connectLastfmUser = async (lastfmUsername: string, userId?: string) => {
        if (!userId) throw new AuthError(401, 'Unauthorized');
        if (!lastfmUsername) lastfmUsername = 'FishingDonut';

        const trimmedUsername = lastfmUsername.trim();

        if (!(await this.lastFmUserExists(trimmedUsername)))
            // eslint-disable-next-line quotes
            throw new ValidationError(400, "This user doesn't exist on lastFm");

        // await this.integrationRepo.disconnectLastfmUsername(userId);
        // await this.integrationRepo.upsertLastfmUsername(trimmedUsername, userId);

        try {
            await this.integrationRepo.connectLastfmUser(trimmedUsername, userId);
        } catch (err) {
            console.log(err);
            throw new IntegrationError(500, 'Error integrating lastfmUsername');
        }

        return { status: 'success', message: 'User connected' };
    };

    private findLastfmUser = async (lastfmUsername: string) => {
        const trimmedUsername = lastfmUsername.trim();
        return await this.integrationRepo.findLastfmUserByUsername(trimmedUsername);
    };

    private lastFmUserExists = async (lastfmUsername: string) => {
        return true;
    };
}

export default IntegrationService;

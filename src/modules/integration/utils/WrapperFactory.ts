import winston from 'winston';
import { Account } from '../../../generated/prisma/client';
import IntegrationError from '../errors/IntegrationError';
import { LastfmWrapper } from '../providers/wrappers/LastfmWrapper';
import { SpotifyWrapper } from '../providers/wrappers/SpotifyWrapper';
import { IProviderConnector } from '../types/IProviderConnector';
import { MusicBrainzWrapper } from './MusicBrainzWrapper';
import IntegrationService from '../IntegrationService';

export class WrapperFactory {
    private musicBrainz: MusicBrainzWrapper;
    private wrapperCache: Map<string, IProviderConnector> = new Map();
    constructor(
        private logger: winston.Logger,
        private integrationService: IntegrationService
    ) {
        this.musicBrainz = new MusicBrainzWrapper();
    }
    createWrapper = (userId: string, provider: Account): IProviderConnector => {
        const cacheKey = provider.providerAccountId;

        if (this.wrapperCache.has(cacheKey)) {
            return this.wrapperCache.get(cacheKey)!;
        }

        if (provider.provider === 'spotify') {
            const wrapper = new SpotifyWrapper(
                provider,
                this.musicBrainz,
                userId,
                this.integrationService,
                this.logger
            );
            this.wrapperCache.set(cacheKey, wrapper);
            return wrapper;
        }

        if (provider.provider === 'lastfm') {
            const wrapper = new LastfmWrapper(
                provider,
                this.musicBrainz,
                userId,
                this.integrationService,
                this.logger
            );
            this.wrapperCache.set(cacheKey, wrapper);
            return wrapper;
        }

        throw new IntegrationError(400, 'Unknown provider');
    };
}

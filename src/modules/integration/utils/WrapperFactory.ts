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
    constructor(
        private logger: winston.Logger,
        private integrationService: IntegrationService
    ) {
        this.musicBrainz = new MusicBrainzWrapper();
    }
    createWrapper = (userId: string, provider: Account): IProviderConnector => {
        if (provider.provider === 'spotify') {
            return new SpotifyWrapper(
                provider,
                this.musicBrainz,
                userId,
                this.integrationService,
                this.logger
            );
        }

        if (provider.provider === 'lastfm') {
            return new LastfmWrapper(
                provider,
                this.musicBrainz,
                userId,
                this.integrationService,
                this.logger
            );
        }

        throw new IntegrationError(400, 'Unknown provider');
    };
}

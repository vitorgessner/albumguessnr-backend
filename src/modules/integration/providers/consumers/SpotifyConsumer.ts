import winston from 'winston';
import { getRabbitChannel } from '../../../../config/rabbitmq';
import IntegrationService from '../../IntegrationService';
import { WrapperFactory } from '../../utils/WrapperFactory';

export const spotifyConsumer = async (
    subQueue: string,
    integrationService: IntegrationService,
    wrapperFactory: WrapperFactory,
    logger: winston.Logger
) => {
    try {
        const exchange = 'syncing_providers';

        const channel = await getRabbitChannel();

        await channel.assertExchange(exchange, 'direct', {
            durable: true,
        });

        const q = await channel.assertQueue(subQueue, { durable: true });

        await channel.bindQueue(q.queue, exchange, subQueue);

        console.log('🎧 [*] Spotify Consumer Ready on queue: ' + subQueue);

        console.log(` [*] Waiting for messages in ${subQueue}. To exit press CTRL+C`);
        channel.consume(q.queue, async function (msg) {
            if (!msg) return;

            try {
                console.log('🎵 Processing Spotify data: ', msg?.content.toString());

                const { userId, providerAccountId } = JSON.parse(msg.content.toString());

                const mainProvider = await integrationService.findMainProvider(userId);

                if (mainProvider.providerAccountId !== providerAccountId) {
                    logger.info('Main provider was changed, skipping current syncing');
                    return channel.ack(msg);
                }

                const spotifyWrapper = wrapperFactory.createWrapper(userId, mainProvider);

                const hasNextPage = await integrationService.fetchUserAlbums(
                    userId,
                    spotifyWrapper
                );

                if (hasNextPage) {
                    const newMessage = Buffer.from(
                        JSON.stringify({
                            userId,
                            providerAccountId: mainProvider.providerAccountId,
                        })
                    );
                    const published = channel.publish(
                        exchange,
                        'sync.spotify.continuation',
                        newMessage
                    );

                    if (!published) {
                        logger.warn('channel buffer is full, message queued locally');
                        return channel.ack(msg);
                    }

                    logger.info(` [x] Sent sync.${mainProvider.provider}.continuation`);
                    return channel.ack(msg);
                }

                return channel.ack(msg);
            } catch (err) {
                console.error('Error processing spotify message: ', err);
                channel.nack(msg, false, false);
            }
        });
    } catch (err) {
        console.log(err);
    }
};

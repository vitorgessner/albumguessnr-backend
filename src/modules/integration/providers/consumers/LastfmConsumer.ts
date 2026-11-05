import winston from 'winston';
import { getRabbitChannel } from '../../../../config/rabbitmq';
import IntegrationService from '../../IntegrationService';
import { WrapperFactory } from '../../utils/WrapperFactory';

export const lastfmConsumer = async (
    subQueue: string,
    integrationService: IntegrationService,
    wrapperFactory: WrapperFactory,
    logger: winston.Logger
) => {
    const exchange = 'syncing_providers';

    const channel = await getRabbitChannel();

    await channel.assertExchange(exchange, 'direct', {
        durable: true,
    });

    const q = await channel.assertQueue(subQueue, { durable: true });

    await channel.bindQueue(q.queue, exchange, subQueue);

    console.log('🎧 [*] Lastfm Consumer Ready on queue: ' + subQueue);

    console.log(` [*] Waiting for messages in ${subQueue} To exit press CTRL+C`);
    channel.consume(q.queue, async function (msg) {
        if (!msg) return;

        try {
            console.log('🎵 Processing lastfm data: ', msg?.content.toString());

            const { userId, providerAccountId, syncingId } = JSON.parse(msg.content.toString());

            const mainProvider = await integrationService.findMainProvider(userId);

            if (
                mainProvider.providerAccountId !== providerAccountId ||
                mainProvider.syncingId !== syncingId
            ) {
                logger.info('Main provider or syncingId was changed, skipping current syncing');
                return channel.ack(msg);
            }

            const lastfmWrapper = wrapperFactory.createWrapper(userId, mainProvider);

            const hasNextPage = await integrationService.fetchUserAlbums(userId, lastfmWrapper);

            if (hasNextPage) {
                const newSyncingId = (await integrationService.findMainProvider(userId)).syncingId;
                const newMessage = Buffer.from(
                    JSON.stringify({
                        userId,
                        providerAccountId: mainProvider.providerAccountId,
                        syncingId: newSyncingId,
                    })
                );
                const published = channel.publish(exchange, 'sync.lastfm.continuation', newMessage);

                if (!published) {
                    logger.warn('channel buffer is full, message queued locally');
                } else {
                    await integrationService.updateLastSynced(
                        mainProvider.provider,
                        mainProvider.providerAccountId,
                        {
                            syncingTimestamp: new Date(),
                        }
                    );
                    logger.info(` [x] Sent sync.${mainProvider.provider}.continuation`);
                }
            }

            channel.ack(msg);
        } catch (err) {
            console.error('Error processing lastfm message: ', err);
            channel.nack(msg, false, false);
        }
    });
};

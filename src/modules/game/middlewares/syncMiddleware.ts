import type { NextFunction, Request, Response } from 'express';
import type IntegrationService from '../../integration/IntegrationService.js';
import AuthError from '../../auth/errors/AuthError.js';
import { logger } from '../../../config/logger/logger.js';
import { getRabbitChannel } from '../../../config/rabbitmq.js';

const syncMiddleware = (integrationService: IntegrationService) => {
    const channel = getRabbitChannel();

    channel.then((res) =>
        res.on('error', (err) => {
            logger.error('RabbitMQ internal channel error: ', err.message);
        })
    );
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.userId;
            if (!userId) throw new AuthError(401, 'Unauthorized');

            const mainProvider = await integrationService.findMainProvider(userId);

            const exchange = 'syncing_providers';
            const message = Buffer.from(
                JSON.stringify({
                    userId,
                    providerAccountId: mainProvider.providerAccountId,
                })
            );

            await channel.then((res) => res.assertExchange(exchange, 'direct', { durable: true }));

            const published = await channel.then((res) =>
                res.publish(exchange, `sync.${mainProvider.provider}.initial`, message)
            );

            if (!published) {
                logger.warn('channel buffer is full, message queued locally');
            } else {
                logger.info(` [x] Sent sync.${mainProvider.provider}.initial`);
            }

            return next();
        } catch (err) {
            logger.error('syncMiddleware catch error: ', err);
            return next(err);
        }
    };
};

export default syncMiddleware;

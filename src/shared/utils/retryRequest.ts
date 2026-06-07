import { logger } from '../../config/logger/logger';
import { sanitizeError } from './sanitizeCause';

const retryRequest = async (cb: () => void, retryTimes: number) => {
    for (let i = 0; i < retryTimes; i++) {
        try {
            await new Promise((resolve) => {
                setTimeout(() => {
                    resolve(cb());
                }, 1000);
            });

            return;
        } catch (err) {
            logger.error(err instanceof Error ? err.message : String(err), {
                cause: sanitizeError(err),
            });
        }
    }

    console.error(`retried ${retryTimes} times but failed them all`);
};

export default retryRequest;

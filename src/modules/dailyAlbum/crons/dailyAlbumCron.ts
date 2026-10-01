import axiosInstance from '../../../config/axios';
import { logger } from '../../../config/logger/logger';
import { env } from '../../../shared/config/env';
import { sleep } from '../../../shared/utils/sleep';

export async function runDailyAlbumCron() {
    const MAX_CRON_RETRIES = 3;
    const BASE_BACKOFF_MS = 2000;

    for (let attempt = 1; attempt <= MAX_CRON_RETRIES + 1; attempt++) {
        try {
            const response = await axiosInstance.post(env.BASE_URL + '/daily/album', null, {
                headers: {
                    Authorization: `Bearer ${env.CRON_API_KEY}`,
                },
            });

            logger.info(
                `Cron executed successfully at ${new Date().toISOString()}:`,
                response.data
            );
            return;
        } catch (error) {
            const isLastAttempt = attempt === MAX_CRON_RETRIES + 1;

            if (isLastAttempt) {
                if (error instanceof Error) {
                    logger.error('⚠️ Cron failed after all retries:', error.message);
                }
                process.exit(1);
            }

            const backoffLimit = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);

            const jitteredWait = Math.random() * backoffLimit;

            if (error instanceof Error) {
                logger.warn(
                    `[Cron - Try ${attempt} failed] Error: ${error.message}. ` +
                        `Waiting ${Math.round(jitteredWait)}ms with jitter before trying again...`
                );
            }

            await sleep(jitteredWait);
        }
    }
}

import { env } from '../../../app';
import axiosInstance from '../../../config/axios';
import { logger } from '../../../config/logger/logger';

export async function runHousekeepingCron() {
    const response = await axiosInstance.delete(env.BASE_URL + '/housekeeping/guests');

    logger.info(
        `Housekeeping cron executed successfully at ${new Date().toISOString()}:`,
        response.data
    );
}

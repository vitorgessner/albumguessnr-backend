import axios from 'axios';
import { logger } from './logger/logger';

const MAX_RETRIES = 3;

const axiosInstance = axios.create({
    headers: {
        'User-Agent': 'AlbumGuessnr/0.0.0 ( gessnervgg@gmail.com )',
    },
});

axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const config = error.config;

        if (error.response?.status !== 429) return Promise.reject(error);
        if (config._retryCount >= MAX_RETRIES) return Promise.reject(error);

        logger.warn(new Error('Rate limit exceeded'));

        config._retryCount = (config._retryCount ?? 0) + 1;

        const retryAfterHeader = error.response.headers['retry-after'];
        const waitMs = retryAfterHeader ? parseFloat(retryAfterHeader) * 1000 : 1000;

        await new Promise((resolve) => setTimeout(resolve, waitMs));
        return axiosInstance(config);
    }
);

export default axiosInstance;

import axios, { AxiosError } from 'axios';
import { env } from '../../../../app';
import { createRetryInterceptor } from '../../utils/createRetryInterceptor';
import { lastfmQueue, musicBrainzQueue } from './rateLimiters';

declare module 'axios' {
    export interface InternalAxiosRequestConfig {
        _retryCount?: number;
        _retry?: boolean;
    }
}

export const getApiInstances = () => {
    const lastfmAxios = axios.create({
        baseURL: 'https://ws.audioscrobbler.com/2.0/',
        params: {
            format: 'json',
            api_key: env.API_KEY,
        },
        headers: {
            'User-Agent': 'AlbumGuessnr/0.0.0 ( gessnervgg@gmail.com )',
        },
    });

    const musicBrainzAxios = axios.create({
        baseURL: 'https://musicbrainz.org/ws/2/release-group',
        params: {
            fmt: 'json',
        },
        headers: {
            'User-Agent': 'AlbumGuessnr/0.0.0 ( gessnervgg@gmail.com )',
        },
    });

    return { lastfmAxios, musicBrainzAxios };
};

const MAX_RETRIES = 3;

export const mbRequest = <T>(fn: () => Promise<T>) =>
    musicBrainzQueue.add(async () => {
        for (let attempt = 0; ; attempt++) {
            try {
                return await fn();
            } catch (error) {
                if (attempt >= MAX_RETRIES) throw error;
                await createRetryInterceptor(error as AxiosError, 'musicbrainz', 2000, attempt);
            }
        }
    });

export const lfRequest = <T>(fn: () => Promise<T>) =>
    lastfmQueue.add(async () => {
        for (let attempt = 0; ; attempt++) {
            try {
                return await fn();
            } catch (error) {
                if (attempt >= MAX_RETRIES) throw error;
                await createRetryInterceptor(error as AxiosError, 'lastfm', 2000, attempt);
            }
        }
    });

import axios, { AxiosError } from 'axios';
import { env } from '../../../../app';
import { createRetryInterceptor } from '../../utils/createRetryInterceptor';
import { SyncStatus } from '../../../../generated/prisma/enums';
import { lastfmQueue, musicBrainzQueue, spotifyQueue } from './rateLimiters';
import axiosInstance from '../../../../config/axios';

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

    const spotifyAxios = axios.create({
        baseURL: 'https://api.spotify.com/v1/',
        headers: {
            'User-Agent': 'AlbumGuessnr/0.0.0 ( gessnervgg@gmail.com )',
        },
    });

    function setupSpotifyInterceptor(
        getAccount: () => Promise<{
            refreshToken: string | null;
            provider: string;
            providerAccountId: string;
        }>,
        updateTokens: (
            provider: string,
            providerAccountId: string,
            tokens: {
                accessToken: string;
                refreshToken: string;
                expiresAt: Date;
            }
        ) => Promise<{
            id: string;
            userId: string;
            provider: string;
            providerAccountId: string;
            accessToken: string | null;
            refreshToken: string | null;
            expiresAt: Date | null;
            username: string;
            displayUsername: string;
            lastSyncedAt: Date | null;
            syncCursor: number;
            syncStatus: SyncStatus;
            syncingTimestamp: Date | null;
            hadFailuresInChain: boolean;
        }>
    ) {
        spotifyAxios.interceptors.response.use(
            (response) => response,
            async (error: AxiosError) => {
                const originalRequest = error.config;

                if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
                    originalRequest._retry = true;

                    try {
                        const account = await getAccount();
                        const params = new URLSearchParams({
                            grant_type: 'refresh_token',
                            refresh_token: account.refreshToken ?? '',
                        });

                        const response = await axiosInstance.post(
                            'https://accounts.spotify.com/api/token',
                            params,
                            {
                                headers: {
                                    'Content-Type': 'application/x-www-form-urlencoded',
                                    Authorization:
                                        'Basic ' +
                                        Buffer.from(
                                            env.SPOTIFY_CLIENT_ID + ':' + env.SPOTIFY_CLIENT_SECRET
                                        ).toString('base64'),
                                },
                            }
                        );

                        const { access_token, refresh_token, expires_in } = response.data;

                        const updated = await updateTokens(
                            account.provider,
                            account.providerAccountId,
                            {
                                accessToken: access_token,
                                refreshToken: refresh_token || account.refreshToken,
                                expiresAt: new Date(
                                    new Date().setSeconds(new Date().getSeconds() + expires_in)
                                ),
                            }
                        );

                        const newToken = updated.accessToken;

                        originalRequest.headers.Authorization = `Bearer ${newToken}`;
                        return spotifyAxios(originalRequest);
                    } catch (refreshError) {
                        return Promise.reject(refreshError);
                    }
                }

                return Promise.reject(error);
            }
        );
    }

    const musicBrainzAxios = axios.create({
        baseURL: 'https://musicbrainz.org/ws/2/release-group',
        params: {
            fmt: 'json',
        },
        headers: {
            'User-Agent': 'AlbumGuessnr/0.0.0 ( gessnervgg@gmail.com )',
        },
    });

    return { spotifyAxios, setupSpotifyInterceptor, lastfmAxios, musicBrainzAxios };
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

export const spRequest = <T>(fn: () => Promise<T>) =>
    spotifyQueue.add(async () => {
        for (let attempt = 0; ; attempt++) {
            try {
                return await fn();
            } catch (error) {
                if (attempt >= MAX_RETRIES) throw error;
                await createRetryInterceptor(error as AxiosError, 'spotify', 2000, attempt);
            }
        }
    });

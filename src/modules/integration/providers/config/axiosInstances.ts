import axios, { AxiosError } from 'axios';
import { env } from '../../../../app';
import { createRetryInterceptor } from '../../utils/createRetryInterceptor';
import { SyncStatus } from '../../../../generated/prisma/enums';
import { lastfmQueue, musicBrainzQueue, spotifyQueue } from './rateLimiters';

declare module 'axios' {
    export interface InternalAxiosRequestConfig {
        _retryCount?: number;
        _retry?: boolean;
    }
}

export const getApiInstances = () => {
    const lastfmAxios = axios.create({
        baseURL: 'http://ws.audioscrobbler.com/2.0/',
        params: {
            format: 'json',
            api_key: env.API_KEY,
        },
        headers: {
            'User-Agent': 'AlbumGuessnr/0.0.0 ( gessnervgg@gmail.com )',
        },
    });

    lastfmAxios.interceptors.request.use(async (config) => {
        await lastfmQueue.add(() => {});
        return config;
    });

    lastfmAxios.interceptors.response.use(
        (response) => response,
        async (error) => {
            const config = error.config;
            await createRetryInterceptor(error, 'lastfm', 2000);
            return lastfmAxios(config);
        }
    );

    let isRefreshing = false;
    let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> =
        [];

    const processQueue = (error: unknown, token: string | null = null) => {
        failedQueue.forEach((promise) => {
            if (error) {
                return promise.reject(error);
            }
            return promise.resolve(token!);
        });
        failedQueue = [];
    };

    const spotifyAxios = axios.create({
        baseURL: 'https://api.spotify.com/v1/',
        headers: {
            'User-Agent': 'AlbumGuessnr/0.0.0 ( gessnervgg@gmail.com )',
        },
    });

    spotifyAxios.interceptors.request.use(async (config) => {
        await spotifyQueue.add(() => {});
        return config;
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
                    if (isRefreshing) {
                        return new Promise((resolve, reject) => {
                            failedQueue.push({ resolve, reject });
                        })
                            .then((token) => {
                                originalRequest.headers.Authorization = `Bearer ${token}`;
                                return spotifyAxios(originalRequest);
                            })
                            .catch((err) => Promise.reject(err));
                    }

                    originalRequest._retry = true;
                    isRefreshing = true;

                    try {
                        const account = await getAccount();
                        const params = new URLSearchParams({
                            grant_type: 'refresh_token',
                            refresh_token: account.refreshToken ?? '',
                        });

                        const response = await spotifyQueue.add(() =>
                            spotifyAxios.post('https://accounts.spotify.com/api/token', params, {
                                headers: {
                                    'Content-Type': 'application/x-www-form-urlencoded',
                                    Authorization:
                                        'Basic ' +
                                        Buffer.from(
                                            env.SPOTIFY_CLIENT_ID + ':' + env.SPOTIFY_CLIENT_SECRET
                                        ).toString('base64'),
                                },
                            })
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

                        processQueue(null, newToken);

                        originalRequest.headers.Authorization = `Bearer ${newToken}`;
                        return spotifyAxios(originalRequest);
                    } catch (refreshError) {
                        processQueue(refreshError, null);
                        return Promise.reject(refreshError);
                    } finally {
                        isRefreshing = false;
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

    musicBrainzAxios.interceptors.request.use(async (config) => {
        await musicBrainzQueue.add(() => {});
        return config;
    });

    musicBrainzAxios.interceptors.response.use(
        (response) => response,
        async (error) => {
            const config = error.config;
            await createRetryInterceptor(error, 'musicbrainz', 1200);
            return musicBrainzAxios(config);
        }
    );

    return { spotifyAxios, setupSpotifyInterceptor, lastfmAxios, musicBrainzAxios };
};

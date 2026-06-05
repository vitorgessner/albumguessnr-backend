import { AxiosError } from 'axios';

export const sanitizeError = (err: unknown) => {
    if (err instanceof AxiosError) {
        return {
            message: err.message,
            status: err.response?.status,
            params: err.config?.params,
            data: err.response?.data,
        };
    }
    return { message: String(err) };
};

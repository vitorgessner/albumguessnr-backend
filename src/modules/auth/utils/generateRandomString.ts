import { getRandomValues } from 'node:crypto';

export const generateRandomString = (length: number) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const randomValues = new Uint8Array(length);
    getRandomValues(randomValues);

    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars[randomValues[i]! % chars.length];
    }

    return result;
};

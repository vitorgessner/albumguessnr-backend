import { createHash } from 'node:crypto';

export function md5(string: string) {
    return createHash('md5').update(string).digest('hex');
}

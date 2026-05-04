import type { User } from '../../../generated/prisma/client.js';

export interface IUserWithUsername extends User {
    profile: {
        username: string;
    } | null;
}

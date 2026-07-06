import type { User } from '../../../generated/prisma/client.js';
import { AccountCreateInput } from '../../../generated/prisma/models.js';

export interface IUserWithUsername extends User {
    profile: {
        username: string;
    } | null;
}

type AccountCreateInputWithoutUser = Omit<AccountCreateInput, 'user'>;

export interface AccountCreateInputWithUser extends AccountCreateInputWithoutUser {
    userId: string;
}

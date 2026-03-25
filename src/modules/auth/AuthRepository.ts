import { prisma } from '../../config/prisma.js';
import type { User } from '../../generated/prisma/client.js';

class AuthRepository {
    findAll = async () => {
        return await prisma.user.findMany();
    };

    findByEmail = async (email: string) => {
        return await prisma.user.findUnique({
            where: { email },
        });
    };

    create = async (user: User) => {
        return await prisma.user.create({
            data: user,
        });
    };
}

export default AuthRepository;

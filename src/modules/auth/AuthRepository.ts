import { prisma } from '../../config/prisma.js';
import type { User } from '../../generated/prisma/client.js';

class AuthRepository {
    findAll = async () => {
        return await prisma.user.findMany();
    };

    findAllWIthProfile = async () => {
        return await prisma.user.findMany({
            include: {
                profile: true,
            },
        });
    };

    findByEmail = async (email: string) => {
        return await prisma.user.findUnique({
            where: { email },
        });
    };

    findByToken = async (userVerificationToken: string) => {
        return await prisma.verificationToken.findUnique({
            where: {
                token: userVerificationToken,
            },
            include: {
                user: true,
            },
        });
    };

    findByIdWithProfile = async (id: string) => {
        return await prisma.user.findUnique({
            where: {
                id,
            },
            include: {
                profile: true,
            },
        });
    };

    create = async (user: User) => {
        return await prisma.user.create({
            data: {
                email: user.email,
                password: user.password,
                profile: {
                    create: {
                        username: user.email.split('@')[0]!,
                        avatar_url: 'http://localhost:3000/profilePictures/default.svg',
                        bio: '',
                    },
                },
            },
        });
    };

    createVerificationToken = async (token: string, email: string) => {
        return await prisma.verificationToken.create({
            data: {
                token,
                expirationTime: new Date(Date.now() + 1000 * 60 * 60 * 24),
                user: {
                    connect: {
                        email,
                    },
                },
            },
        });
    };

    verifyEmail = async (email: string, token: string) => {
        return await prisma.user.update({
            where: {
                email,
            },
            data: {
                emailVerifies: true,
                verificationToken: {
                    delete: {
                        token,
                    },
                },
            },
        });
    };

    deleteTokens = async (email: string) => {
        return await prisma.verificationToken.deleteMany({
            where: {
                user: {
                    email,
                },
            },
        });
    };
}

export default AuthRepository;

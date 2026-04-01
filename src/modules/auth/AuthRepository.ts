import { prisma } from '../../config/prisma.js';
import type { UserCreateInput } from '../../generated/prisma/models.js';

class AuthRepository {
    findAll = async () => {
        return await prisma.user.findMany();
    };

    findAllWithProfile = async () => {
        return await prisma.user.findMany({
            include: {
                profile: true,
            },
        });
    };

    findAllWithLastFmIntegration = async () => {
        return await prisma.user.findMany({
            include: {
                lastfmIntegration: true,
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

    findByIdWithProfileAndLastfmIntegration = async (id: string) => {
        return await prisma.user.findUnique({
            where: {
                id,
            },
            include: {
                profile: true,
                lastfmIntegration: true,
            },
            omit: {
                password: true,
            },
        });
    };

    create = async (user: UserCreateInput) => {
        return await prisma.user.create({
            data: {
                email: user.email,
                password: user.password,
                profile: {
                    create: {
                        username: user.email.split('@')[0]! + Math.round(Math.random() * 100000000),
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
                emailVerified: true,
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

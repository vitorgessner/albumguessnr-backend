import { prisma } from '../../config/prisma.js';
import type { UserCreateInput } from '../../generated/prisma/models.js';

class AuthRepository {
    findAll = async () => {
        return await prisma.user.findMany({
            omit: {
                email: true,
                password: true,
            },
            include: {
                lastfmIntegration: {
                    include: {
                        userAlbumFamiliarities: true,
                    },
                },
            },
        });
    };

    findAllWithProfile = async () => {
        return await prisma.user.findMany({
            include: {
                profile: true,
            },
            omit: {
                email: true,
                password: true,
            },
        });
    };

    findAllWithLastFmIntegration = async () => {
        return await prisma.user.findMany({
            include: {
                lastfmIntegration: true,
            },
            omit: {
                email: true,
                password: true,
            },
        });
    };

    findByEmail = async (email: string) => {
        return await prisma.user.findUnique({
            where: { email },
            include: {
                profile: {
                    select: {
                        username: true,
                    },
                },
            },
        });
    };

    findByToken = async (userVerificationToken: string) => {
        return await prisma.verificationToken.findUnique({
            where: {
                token: userVerificationToken,
            },
            include: {
                user: {
                    omit: {
                        password: true,
                    },
                },
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
                receivedRequests: true,
                sentRequests: true,
                userStats: true,
            },
            omit: {
                email: true,
                password: true,
            },
        });
    };

    create = async (user: UserCreateInput, default_avatar: string) => {
        const username = user.email.split('@')[0]! + Math.round(Math.random() * 100000000);
        return await prisma.user.create({
            data: {
                email: user.email,
                password: user.password,
                profile: {
                    create: {
                        username: username,
                        displayUsername: username,
                        avatar_url: default_avatar,
                        bio: '',
                    },
                },
                userStats: {
                    create: {},
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

    findRefreshToken = async (token: string) => {
        return await prisma.refreshToken.findUnique({
            where: {
                token,
            },
            include: {
                user: {
                    omit: {
                        password: true,
                    },
                },
            },
        });
    };

    deleteRefreshToken = async (token: string) => {
        return await prisma.refreshToken.delete({
            where: {
                token,
            },
        });
    };

    createRefreshToken = async (token: string, email: string) => {
        return await prisma.refreshToken.create({
            data: {
                token,
                expirationTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
                user: {
                    connect: {
                        email,
                    },
                },
            },
        });
    };

    deleteVerificationToken = async (token: string) => {
        return await prisma.verificationToken.delete({
            where: {
                token,
            },
        });
    };

    editPassword = async (email: string, password: string) => {
        return await prisma.user.update({
            where: {
                email,
            },
            data: {
                password,
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

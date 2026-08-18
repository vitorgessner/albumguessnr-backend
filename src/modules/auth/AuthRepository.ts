import { prisma } from '../../config/prisma.js';
import type {
    AccountCreateWithoutUserInput,
    UserCreateInput,
} from '../../generated/prisma/models.js';
import { AccountCreateInputWithUser } from './types/user.js';

class AuthRepository {
    constructor(private default_avatar: string) {}

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

    findByEmail = async (email: string) => {
        return await prisma.user.findUnique({
            where: { email },
            include: {
                profile: true,
                accounts: true,
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

    findByIdWithProfileAndAccounts = async (id: string) => {
        return await prisma.user.findUnique({
            where: {
                id,
            },
            include: {
                profile: true,
                accounts: true,
                // receivedRequests: true,
                // sentRequests: true,
                userStats: true,
            },
            omit: {
                email: true,
                password: true,
            },
        });
    };

    create = async (user: UserCreateInput) => {
        const username = user.email.split('@')[0]! + Math.round(Math.random() * 100000000);
        return await prisma.user.create({
            data: {
                email: user.email,
                password: user.password ?? null,
                emailVerified: user.emailVerified ?? false,
                profile: {
                    create: {
                        username: username,
                        displayUsername: username,
                        avatar_url: this.default_avatar,
                        bio: '',
                    },
                },
                userStats: {
                    create: {},
                },
            },
            include: {
                profile: {
                    select: {
                        username: true,
                    },
                },
            },
        });
    };

    createProvider = async (account: AccountCreateInputWithUser) => {
        return prisma.account.create({
            data: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                username: account.username,
                displayUsername: account.displayUsername || '',
                userId: account.userId,
                accessToken: account.accessToken || null,
                refreshToken: account.refreshToken || null,
                expiresAt: account.expiresAt || null,
            },
        });
    };

    findMainProvider = async (userId: string) => {
        return prisma.user.findUnique({
            where: {
                id: userId,
            },
            select: {
                mainAccount: true,
            },
        });
    };

    setMainProvider = async (userId: string, mainAccountId: string) => {
        return prisma.user.update({
            where: {
                id: userId,
            },
            data: {
                mainAccountId,
            },
        });
    };

    upsertUserWithAccount = async (
        user: UserCreateInput,
        account: AccountCreateWithoutUserInput
    ) => {
        const username = user.email.split('@')[0]! + Math.round(Math.random() * 100000000);
        return prisma.user.upsert({
            where: {
                email: user.email,
            },
            create: {
                email: user.email,
                password: user.password ?? null,
                emailVerified: user.emailVerified ?? false,
                profile: {
                    create: {
                        username: username,
                        displayUsername: username,
                        avatar_url: this.default_avatar,
                        bio: '',
                    },
                },
                accounts: {
                    create: {
                        ...account,
                        username: account.username ?? username,
                        displayUsername: account.username ?? username,
                    },
                },
                userStats: {
                    create: {},
                },
            },
            update: {
                accounts: {
                    connectOrCreate: {
                        where: {
                            provider_providerAccountId: {
                                provider: account.provider,
                                providerAccountId: account.providerAccountId,
                            },
                        },
                        create: {
                            ...account,
                        },
                    },
                },
            },
            include: {
                accounts: true,
                profile: true,
            },
        });
    };

    getAccount = async (provider: string, providerAccountId: string) => {
        return await prisma.account.findUnique({
            where: {
                provider_providerAccountId: {
                    provider,
                    providerAccountId,
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

import { prisma } from '../../config/prisma.js';
import { Prisma, UserDailyAlbumOverallStatistics } from '../../generated/prisma/client.js';
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

    findById = async (id: string) => {
        return await prisma.user.findUnique({
            where: { id },
            include: {
                refreshToken: true,
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

    findRefreshTokenByEmail = async (email: string) => {
        return await prisma.user.findUnique({
            where: { email },
            select: {
                refreshToken: true,
            },
        });
    };

    findVerificationModelByToken = async (userVerificationToken: string) => {
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
                userStats: true,
                mainAccount: true,
            },
            omit: {
                email: true,
                password: true,
            },
        });
    };

    create = async (
        user: UserCreateInput,
        dailyAlbumGuesses?:
            | Prisma.UserDailyAlbumGetPayload<{ include: { dailyAlbum: true } }>[]
            | undefined,
        userDailyAlbumOverallStatistics?: UserDailyAlbumOverallStatistics
    ) => {
        if (!user.email) {
            return null;
        }

        const id = user.id || '';

        const username = String(Math.round(Math.random() * 100000000));

        const createData: Prisma.UserCreateInput = {
            email: user.email,
            password: user.password ?? null,
            emailVerified: user.emailVerified ?? false,
            profile: {
                create: {
                    username,
                    displayUsername: username,
                    avatar_url: this.default_avatar,
                    bio: '',
                },
            },
            userStats: {
                create: {},
            },
        };

        if (dailyAlbumGuesses && dailyAlbumGuesses.length > 0) {
            const formattedGuesses: Prisma.UserDailyAlbumUncheckedCreateWithoutUserInput[] =
                dailyAlbumGuesses.map((guess) => ({
                    status: guess.status,
                    nthPlayerToGuess: guess.nthPlayerToGuess,
                    dailyAlbumId: guess.dailyAlbumId ?? guess.dailyAlbum.albumId,
                }));

            createData.dailyAlbumGuesses = {
                create: formattedGuesses,
            };
        }

        if (userDailyAlbumOverallStatistics) {
            createData.userDailyAlbumOverallStatistics = {
                create: {
                    correctlyGuessed: userDailyAlbumOverallStatistics.correctlyGuessed,
                    currentStreak: userDailyAlbumOverallStatistics.currentStreak,
                    maxStreak: userDailyAlbumOverallStatistics.maxStreak,
                    meanToGuess: userDailyAlbumOverallStatistics.meanToGuess,
                    numberOfFirstGuesses: userDailyAlbumOverallStatistics.numberOfFirstGuesses,
                    totalGuessed: userDailyAlbumOverallStatistics.totalGuessed,
                },
            };
        }

        return await prisma.user.upsert({
            where: { id },
            create: createData,
            update: {
                email: user.email,
                password: user.password ?? null,
                emailVerified: user.emailVerified ?? false,
                userStats: {
                    create: {},
                },
                profile: {
                    upsert: {
                        where: {
                            userId: id,
                        },
                        create: {
                            username,
                            displayUsername: username,
                            avatar_url: this.default_avatar,
                            bio: '',
                        },
                        update: {
                            username,
                            displayUsername: username,
                            avatar_url: this.default_avatar,
                            bio: '',
                        },
                    },
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

    createGuest = async () => {
        return await prisma.user.create({
            data: {
                isGuest: true,
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
        account: AccountCreateWithoutUserInput,
        userId: string | undefined
    ) => {
        if (!user.email) {
            return null;
        }

        const username = String(Math.round(Math.random() * 100000000));

        if (userId) {
            const existingUser = await prisma.user.findUnique({
                where: {
                    email: user.email,
                },
                include: {
                    accounts: true,
                    profile: true,
                },
            });

            if (existingUser) {
                await prisma.user.delete({
                    where: {
                        id: userId,
                        isGuest: true,
                    },
                    include: {
                        refreshToken: true,
                    },
                });

                return existingUser;
            }

            return await prisma.user.upsert({
                where: {
                    id: userId,
                },
                create: {
                    email: user.email,
                    password: user.password ?? null,
                    emailVerified: user.emailVerified ?? false,
                    isGuest: false,
                    profile: {
                        create: {
                            username,
                            displayUsername: username,
                            avatar_url: this.default_avatar,
                            bio: '',
                        },
                    },
                    userStats: {
                        create: {},
                    },
                    accounts: {
                        create: {
                            ...account,
                            username: account.username ?? username,
                            displayUsername: account.username ?? username,
                        },
                    },
                },
                update: {
                    email: user.email,
                    password: user.password ?? null,
                    emailVerified: user.emailVerified ?? false,
                    isGuest: false,
                    profile: {
                        create: {
                            username,
                            displayUsername: username,
                            avatar_url: this.default_avatar,
                            bio: '',
                        },
                    },
                    userStats: {
                        create: {},
                    },
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
        }

        return prisma.user.upsert({
            where: {
                email: user.email,
            },
            create: {
                email: user.email,
                password: user.password ?? null,
                emailVerified: user.emailVerified ?? false,
                isGuest: false,
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

    findRefreshModel = async (token: string) => {
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

    createRefreshModel = async (token: string, id: string) => {
        return await prisma.refreshToken.create({
            data: {
                token,
                expirationTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
                user: {
                    connect: {
                        id,
                    },
                },
            },
        });
    };

    createRefreshTokenForGuest = async (token: string, id: string) => {
        return await prisma.refreshToken.create({
            data: {
                token,
                expirationTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
                user: {
                    connect: {
                        id,
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
                isGuest: false,
                verificationToken: {
                    delete: {
                        token,
                    },
                },
            },
        });
    };

    setReplacedByToken = async (token: string, tokenToSet: string) => {
        return await prisma.refreshToken.updateMany({
            where: { token, replacedByToken: null },
            data: { replacedByToken: tokenToSet, replacedAt: new Date() },
        });
    };

    setResynchronizedAt = async (token: string) => {
        return await prisma.refreshToken.updateMany({
            where: {
                token,
                OR: [
                    {
                        resynchronizedAt: null,
                    },
                    {
                        resynchronizedAt: {
                            lt: new Date(new Date().getTime() - 20000),
                        },
                    },
                ],
            },
            data: {
                resynchronizedAt: new Date(),
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

    deleteTokensViaId = async (id: string) => {
        return await prisma.verificationToken.deleteMany({
            where: {
                userId: id,
            },
        });
    };

    deleteRefreshTokensViaId = async (id: string) => {
        return await prisma.refreshToken.deleteMany({
            where: {
                userId: id,
            },
        });
    };

    deleteReplacedAndExpiredTokens = async () => {
        return await prisma.refreshToken.deleteMany({
            where: {
                OR: [
                    {
                        replacedByToken: {
                            not: null,
                        },
                    },
                    {
                        expirationTime: {
                            lte: new Date(),
                        },
                    },
                ],
            },
        });
    };

    deleteExpiredGuests = async () => {
        const guestsToDelete = await prisma.user.findMany({
            where: {
                isGuest: true,
                refreshToken: {
                    none: {},
                },
            },
            select: { id: true },
        });

        if (guestsToDelete.length === 0) {
            return { count: 0 };
        }

        return await prisma.user.deleteMany({
            where: {
                id: {
                    in: guestsToDelete.map((user) => user.id),
                },
            },
        });
    };

    updateGuestExpirationTime = async (userId: string) => {
        return await prisma.user.update({
            where: {
                id: userId,
            },
            data: {
                refreshToken: {
                    updateMany: {
                        where: {
                            userId,
                        },
                        data: {
                            expirationTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
                        },
                    },
                },
            },
        });
    };

    findLastLoginEvent = async (userId: string) => {
        const lastLoginEvent = await prisma.loginEvents.findMany({
            where: {
                userId,
            },
            orderBy: {
                loggedAt: 'desc',
            },
            take: 1,
        });

        return lastLoginEvent[0];
    };

    emitLoginEvent = async (userId: string) => {
        return await prisma.loginEvents.create({
            data: {
                userId,
                loggedAt: new Date(),
            },
        });
    };
}

export default AuthRepository;

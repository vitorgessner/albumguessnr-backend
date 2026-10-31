import bcrypt from 'bcryptjs';
import ValidationError from '../../shared/errors/ValidationError.js';
import type AuthRepository from './AuthRepository.js';
import { randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import AuthError from './errors/AuthError.js';
import type { UserCreateInput } from '../../generated/prisma/models.js';
import { env } from '../../shared/config/env.js';
import type { AccountCreateInputWithUser, IUserWithUsername } from './types/user.js';
import winston from 'winston';
import { sanitizeError } from '../../shared/utils/sanitizeCause.js';
import { buildEmailTemplate } from './utils/buildEmail.js';
import { Profile } from 'passport-google-oauth20';
import { sendMail } from '../../shared/utils/sendMail.js';
import * as crypto from 'node:crypto';
import { DailyAlbumRepository } from '../dailyAlbum/DailyAlbumRepository.js';
import { logger } from '../../config/logger/logger.js';
import { isToday } from '../../shared/utils/isToday.js';

class AuthService {
    constructor(
        private authRepo: AuthRepository,
        private dailyAlbumRepo: DailyAlbumRepository,
        private logger: winston.Logger
    ) {}

    getAllWithProfile = async () => {
        const users = await this.authRepo.findAllWithProfile();

        return users;
    };

    getGuest = async (id: string | undefined) => {
        if (!id) {
            throw new AuthError(400, 'No id was provided');
        }

        const guest = await this.authRepo.findById(id);
        if (!guest) {
            throw new AuthError(404, 'Guest was not found');
        }

        return guest;
    };

    me = async (id: string) => {
        const me = await this.authRepo.findByIdWithProfileAndAccounts(id);
        if (!me) return null;

        if (me.userStats) {
            me.userStats.totalScore = Math.round(me.userStats?.totalScore / 100);
        }

        if (me) {
            await this.updateGuestExpirationTime(me.id);
        }

        return me;
    };

    login = async (email: string, password: string) => {
        const user = await this.validateEmail(email);
        const validUser = await this.validatePassword(user, password);

        await this.authRepo.deleteRefreshTokensViaId(validUser.id);
        const { token, refresh } = await this.generateTokens(user.id, user.isGuest);

        await this.emitLoginEvent(user.id);

        return { token, refresh, username: validUser.profile?.username };
    };

    oAuthLogin = async (profile: Profile, userId?: string) => {
        if (!profile._json.email) return new AuthError(404, 'Email not found');

        const fallbackUsername =
            profile.displayName || profile.emails?.[0]?.value.split('@')[0] || profile.id;

        const existingUser = await this.authRepo.findByEmail(profile._json.email);

        const isEmailVerified =
            (existingUser?.emailVerified || profile._json.email_verified) ?? false;

        const user = {
            email: profile._json.email,
            emailVerified: isEmailVerified,
        };

        const account = {
            provider: 'google',
            providerAccountId: profile.id,
            username: profile.username || fallbackUsername,
            displayUsername: profile.displayName || fallbackUsername,
        };

        if (existingUser && existingUser.emailVerified) {
            const newUser = await this.authRepo.upsertUserWithAccount(user, account, userId);

            if (!newUser) {
                return new Error('Failed to login with google');
            }

            await this.emitLoginEvent(newUser.id);
            return newUser;
        }

        if (!isEmailVerified) {
            await this.sendTokenToEmail(profile._json.email);
            return { user: null, message: 'Email not verified' };
        }

        const newUser = await this.authRepo.upsertUserWithAccount(user, account, userId);
        if (!newUser) {
            return new Error('Failed to login with google');
        }

        await this.emitLoginEvent(newUser.id);
        return newUser;
    };

    register = async (email: string, password?: string, userId?: string) => {
        if (!email) throw new ValidationError(400, 'Email is required');

        const user = await this.authRepo.findByEmail(email);

        const childLogger = this.instantiateChildLogger({
            userId: user?.id,
            email: user?.email ?? null,
            username: user?.profile?.username,
        });

        if (user && password) {
            sendMail(
                email,
                'Account creation attempt',
                buildEmailTemplate(
                    'Account creation attempt',
                    // eslint-disable-next-line max-len
                    'Someone tried to create an account with your email. If it was you, try logging in'
                )
            ).catch((err) =>
                childLogger.error(
                    new AuthError(500, 'Failed to send email', { cause: sanitizeError(err) })
                )
            );
            return { status: 'success', user };
        }

        if (user && !password) {
            return { status: 'success', user };
        }

        if (!password) {
            const {
                newUser: generatedUser,
                dailyAlbumGuesses,
                userDailyAlbumOverallStatistics,
            } = await this.generateUser(email, null, true, userId);
            const newUser = await this.authRepo.create(
                generatedUser,
                dailyAlbumGuesses,
                userDailyAlbumOverallStatistics
            );
            return { status: newUser ? 'success' : 'error', user: newUser };
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const { newUser, dailyAlbumGuesses, userDailyAlbumOverallStatistics } =
            await this.generateUser(email, hashedPassword, false, userId);

        const createdUser = await this.authRepo.create(
            newUser,
            dailyAlbumGuesses,
            userDailyAlbumOverallStatistics
        );

        await this.sendTokenToEmail(email);

        return { status: 'success', user: createdUser };
    };

    createGuest = async () => {
        const user = await this.authRepo.createGuest();
        await this.authRepo.deleteTokensViaId(user.id);
        const { token, refresh } = await this.generateTokens(user.id, user.isGuest);

        return { user, token, refresh };
    };

    createAccount = async (account: AccountCreateInputWithUser) => {
        const accountData = await this.authRepo.getAccount(
            account.provider,
            account.providerAccountId
        );

        if (accountData) {
            return { status: 'success', message: 'Logging in', account: accountData };
        }

        const newAccount = await this.authRepo.createProvider(account);
        return { status: 'success', message: 'Account created', account: newAccount };
    };

    hasMainProvider = async (userId: string) => {
        const mainProvider = await this.authRepo.findMainProvider(userId);
        if (!mainProvider) return null;

        const mainAccount = mainProvider.mainAccount;
        if (!mainAccount) return null;

        return mainAccount;
    };

    setMainProvider = async (userId: string, mainAccountId: string) => {
        return await this.authRepo.setMainProvider(userId, mainAccountId);
    };

    resendEmail = async (email: string) => {
        if (!email) throw new ValidationError(400, 'Email is required');

        const user = await this.authRepo.findByEmail(email);
        if (!user) return;

        if (!user.emailVerified) {
            return await this.sendTokenToEmail(email);
        }

        const childLogger = this.instantiateChildLogger({
            userId: user?.id,
            email: user?.email,
            username: user?.profile?.username,
        });

        sendMail(
            email,
            'Email already verified',
            buildEmailTemplate(
                'Email already verified',
                'Your email was already verified by our system, please try logging in instead'
            )
        ).catch((err) =>
            childLogger.error(
                new AuthError(500, 'Failed to send email', { cause: sanitizeError(err) })
            )
        );

        return { status: 'success' };
    };

    forgot = async (email: string) => {
        if (!email) throw new ValidationError(400, 'Email is required');

        const user = await this.authRepo.findByEmail(email);
        if (!user) return;

        await this.sendPasswordResetTokenToEmail(email);

        return { status: 'success' };
    };

    editPassword = async (passwordResetToken: string, password: string) => {
        if (!passwordResetToken) throw new ValidationError(400, 'Token should be provided');
        const verificationModel =
            await this.authRepo.findVerificationModelByToken(passwordResetToken);

        if (!verificationModel) {
            throw new AuthError(404, 'Token not found');
        }

        if (verificationModel.expirationTime.getTime() < new Date(Date.now()).getTime()) {
            throw new AuthError(401, 'Token expired');
        }

        if (!verificationModel.user.emailVerified || !verificationModel.user.email) {
            throw new AuthError(401, 'Email is not verified or user is not logged in');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const response = await this.authRepo.editPassword(
            verificationModel.user.email,
            hashedPassword
        );
        await this.authRepo.deleteVerificationToken(passwordResetToken);

        return response;
    };

    private sendPasswordResetTokenToEmail = async (email: string) => {
        await this.authRepo.deleteTokens(email);
        const token = this.generateToken();
        const passwordResetToken = await this.authRepo.createVerificationToken(token, email);
        const resetToken = passwordResetToken.token;

        const childLogger = this.instantiateChildLogger({ email });
        sendMail(
            email,
            'Forgot your password',
            buildEmailTemplate(
                'Reset password',
                'Please click on the button below to change your password',
                'If it was not you, please ignore this email.',
                `/auth/passwordChange/${resetToken}`
            )
        ).catch((err) =>
            childLogger.error(
                new AuthError(500, 'Failed to send email', { cause: sanitizeError(err) })
            )
        );
    };

    verifyEmail = async (userVerificationToken: string) => {
        const verificationModel =
            await this.authRepo.findVerificationModelByToken(userVerificationToken);

        if (!verificationModel) {
            throw new AuthError(404, 'Token not found');
        }

        if (verificationModel.expirationTime.getTime() < new Date(Date.now()).getTime()) {
            throw new AuthError(401, 'Token expired');
        }

        if (!verificationModel.user.email) {
            throw new AuthError(401, 'User is not logged in');
        }

        const validUser = await this.authRepo.verifyEmail(
            verificationModel.user.email,
            verificationModel.token
        );

        const user = await this.authRepo.findByIdWithProfileAndAccounts(verificationModel.user.id);
        if (!user) throw new AuthError(404, 'user does not exists');

        const { token, refresh } = await this.generateTokens(
            verificationModel.userId,
            verificationModel.user.isGuest
        );

        return {
            token,
            refresh,
            username: user?.profile?.username,
            id: validUser.id,
        };
    };

    refresh = async (token: string) => {
        const hashToken = crypto.createHash('sha256').update(token).digest('hex');
        const refreshModel = await this.authRepo.findRefreshModel(hashToken);
        if (!refreshModel) throw new AuthError(401, 'Token not found');

        if (refreshModel.expirationTime.getTime() < new Date(Date.now()).getTime()) {
            throw new AuthError(401, 'Token expired');
        }

        if (!refreshModel.user.isGuest && !refreshModel.user.email) {
            throw new AuthError(401, 'User is not logged in');
        }

        if (!refreshModel.replacedByToken) {
            const { token, refresh, hashRefreshToken } = await this.generateTokens(
                refreshModel.userId,
                refreshModel.user.isGuest
            );

            await this.authRepo.setReplacedByToken(refreshModel.token, hashRefreshToken);
            await this.emitLoginEvent(refreshModel.userId);

            return { accessToken: token, refresh, isGuest: refreshModel.user.isGuest };
        }

        const replacedAt = refreshModel.replacedAt?.getTime();
        if (this.wasRefreshModelReplacedIn10Seconds(replacedAt)) {
            const { token, refresh } = await this.generateTokens(
                refreshModel.userId,
                refreshModel.user.isGuest
            );

            await this.emitLoginEvent(refreshModel.userId);

            return { accessToken: token, refresh, isGuest: refreshModel.user.isGuest };
        }

        if (
            refreshModel.user.isGuest &&
            (!refreshModel.resynchronizedAt ||
                Date.now() - refreshModel.resynchronizedAt.getTime() > 1000 * 20)
        ) {
            const update = await this.authRepo.setResynchronizedAt(refreshModel.token);

            if (update.count === 0) {
                throw new AuthError(
                    401,
                    'Refresh token recently resynchronized',
                    {},
                    'RESYNC_TOO_SOON'
                );
            }

            const { token, refresh } = await this.generateTokens(
                refreshModel.userId,
                refreshModel.user.isGuest
            );

            await this.emitLoginEvent(refreshModel.userId);

            logger.warn('Guest resync', { userId: refreshModel.userId });
            return { accessToken: token, refresh, isGuest: refreshModel.user.isGuest };
        }

        if (refreshModel.user.isGuest) {
            throw new AuthError(
                401,
                'Refresh token recently resynchronized',
                {},
                'RESYNC_TOO_SOON'
            );
        }

        await this.authRepo.deleteRefreshTokensViaId(refreshModel.userId);
        throw new AuthError(401, 'Refresh token reuse detected');
    };

    deleteRefreshToken = async (token: string) => {
        const refreshModel = await this.authRepo.findRefreshModel(token ?? '');
        if (!refreshModel) return;

        return await this.authRepo.deleteRefreshToken(refreshModel.token);
    };

    generateTokens = async (id: string, isGuest: boolean) => {
        const refreshToken = this.generateToken();
        const hashRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
        const token = this.generateJwtToken(id, isGuest);
        if (isGuest) {
            await this.authRepo.createRefreshTokenForGuest(hashRefreshToken, id);
            return { token, refresh: refreshToken, hashRefreshToken };
        }

        await this.authRepo.createRefreshModel(hashRefreshToken, id);
        return { token, refresh: refreshToken, hashRefreshToken };
    };

    houseKeepGuestsAndTokens = async () => {
        const tokensDeleted = await this.authRepo.deleteReplacedAndExpiredTokens();
        const guestsDeleted = await this.authRepo.deleteExpiredGuests();

        return { tokensDeleted: tokensDeleted.count, guestsDeleted: guestsDeleted.count };
    };

    private instantiateChildLogger = ({
        userId,
        email,
        username,
    }: {
        userId?: string | undefined;
        email?: string | null;
        username?: string | undefined;
    }) => {
        const childLogger = this.logger.child({
            requestId: userId,
            email,
            username,
        });

        return childLogger;
    };

    private validateEmail = async (email: string) => {
        const user = await this.authRepo.findByEmail(email);

        if (!user) throw new ValidationError(404, 'Email or password incorrect');
        if (!user.emailVerified) throw new AuthError(401, 'Email not verified');

        return user;
    };

    private validatePassword = async (user: IUserWithUsername, password: string) => {
        if (!user.password) throw new AuthError(400, 'User does not have a password');

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) throw new ValidationError(404, 'Email or password incorrect');

        return user;
    };

    private generateToken = () => {
        return randomBytes(32).toString('hex');
    };

    private generateJwtToken = (id: string, isGuest: boolean) => {
        return jwt.sign({ id, isGuest }, env.SECRET_JWT as jwt.Secret, {
            expiresIn: '1h',
        });
    };

    private generateUser = async (
        email: string,
        hashedPassword: string | null,
        emailVerified: boolean = false,
        userId?: string | undefined
    ) => {
        const newUser: UserCreateInput = {
            email,
            password: hashedPassword,
            emailVerified: emailVerified,
        };

        if (userId) {
            newUser.id = userId;
            const userDailyAlbumOverallStatistics =
                (await this.dailyAlbumRepo.getUserDailyAlbumOverallStatistics(userId)) || {
                    userId,
                    totalGuessed: 0,
                    correctlyGuessed: 0,
                    meanToGuess: 0,
                    numberOfFirstGuesses: 0,
                    currentStreak: 0,
                    maxStreak: 0,
                };

            const dailyAlbumGuesses =
                await this.dailyAlbumRepo.getAllUserDailyAlbumStatistics(userId);

            return {
                newUser,
                userDailyAlbumOverallStatistics,
                dailyAlbumGuesses: dailyAlbumGuesses?.dailyAlbumGuesses,
            };
        }
        return { newUser };
    };

    private sendTokenToEmail = async (email: string) => {
        await this.authRepo.deleteTokens(email);
        const token = this.generateToken();
        const userVerificationToken = await this.authRepo.createVerificationToken(token, email);
        const verificationToken = userVerificationToken.token;

        const childLogger = this.instantiateChildLogger({ email });
        sendMail(
            email,
            'Verify your account',
            buildEmailTemplate(
                'Verify your account',
                // eslint-disable-next-line max-len
                'Welcome to the most fun community for album guessing. Prepare to compete with your friends and see who does better.',
                'Please click on the button below to verify your account and start guessing!',
                `/verify/${verificationToken}`
            )
        ).catch((err) =>
            childLogger.error(
                new AuthError(500, 'Failed to send email', { cause: sanitizeError(err) })
            )
        );
    };

    private updateGuestExpirationTime = async (userId: string) => {
        if (!userId) {
            throw new AuthError(404, 'Failed to get userId');
        }

        return await this.authRepo.updateGuestExpirationTime(userId);
    };

    private wasRefreshModelReplacedIn10Seconds = (replacedAt: number | undefined) => {
        return Date.now() - (replacedAt || Date.now() - 15 * 1000) < 1000 * 10;
    };

    private emitLoginEvent = async (userId: string) => {
        const lastLogin = await this.authRepo.findLastLoginEvent(userId);
        if (!lastLogin || !isToday(lastLogin.loggedAt)) {
            await this.authRepo.emitLoginEvent(userId);
        }
    };
}

export default AuthService;

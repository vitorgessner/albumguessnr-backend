import bcrypt from 'bcryptjs';
import ValidationError from '../../shared/errors/ValidationError.js';
import type AuthRepository from './AuthRepository.js';
import { randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { resend } from './utils/transporter.js';
import AuthError from './errors/AuthError.js';
import type { UserCreateInput } from '../../generated/prisma/models.js';
import { env } from '../../shared/config/env.js';
import type { IUserWithUsername } from './types/user.js';
import ProfileRepository from '../profile/ProfileRepository.js';
import winston from 'winston';
import { sanitizeError } from '../../shared/utils/sanitizeCause.js';
import { buildEmailTemplate } from './utils/buildEmail.js';

class AuthService {
    constructor(
        private authRepo: AuthRepository,
        private profileRepo: ProfileRepository,
        private logger: winston.Logger,
        private default_avatar: string
    ) {}

    getAll = async () => {
        const users = await this.authRepo.findAll();

        return users;
    };

    getAllWithProfile = async () => {
        const users = await this.authRepo.findAllWithProfile();

        return users;
    };

    getAllWithLastfmIntegration = async () => {
        const users = await this.authRepo.findAllWithLastFmIntegration();

        return users;
    };

    me = async (id: string) => {
        const me = await this.authRepo.findByIdWithProfileAndLastfmIntegration(id);
        if (!me || !me.userStats) return null;

        me.userStats.totalScore = Math.round(me.userStats.totalScore / 100);

        return me;
    };

    login = async (email: string, password: string) => {
        const user = await this.validateEmail(email);
        const validUser = await this.validatePassword(user, password);

        const refreshToken = this.generateToken();
        const refresh = await this.authRepo.createRefreshToken(refreshToken, email);

        const token = this.generateJwtToken(validUser.id);

        return { token, refresh: refresh.token, username: validUser.profile?.username };
    };

    register = async (email: string, password: string) => {
        if (!email) throw new ValidationError(400, 'Email is required');
        if (!password) throw new ValidationError(400, 'Password is required');

        const emailExists = await this.authRepo.findByEmail(email);
        const childLogger = this.instantiateChildLogger({
            userId: emailExists?.id,
            email: emailExists?.email,
            username: emailExists?.profile?.username,
        });

        if (emailExists) {
            this.sendMail(
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
            return { status: 'success' };
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = this.generateUser(email, hashedPassword);

        await this.authRepo.create(newUser, this.default_avatar);

        await this.sendTokenToEmail(email);

        return { status: 'success' };
    };

    resendEmail = async (email: string) => {
        if (!email) throw new ValidationError(400, 'Email is required');

        const emailExists = await this.authRepo.findByEmail(email);
        if (!emailExists) return;

        if (!emailExists.emailVerified) {
            return await this.sendTokenToEmail(email);
        }

        const childLogger = this.instantiateChildLogger({
            userId: emailExists?.id,
            email: emailExists?.email,
            username: emailExists?.profile?.username,
        });

        this.sendMail(
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

        const emailExists = await this.authRepo.findByEmail(email);
        if (!emailExists) return;

        const username = emailExists.profile?.username;

        const childLogger = this.instantiateChildLogger({
            userId: emailExists?.id,
            email: emailExists?.email,
            username,
        });

        this.sendMail(
            email,
            'Forgot your password',
            buildEmailTemplate(
                'Reset password',
                'Please click on the button below to change your password',
                'If it was not you, please, ignore this email',
                `/auth/${username}/passwordChange`
            )
        ).catch((err) =>
            childLogger.error(
                new AuthError(500, 'Failed to send email', { cause: sanitizeError(err) })
            )
        );

        return { status: 'success' };
    };

    editPassword = async (username: string, password: string) => {
        if (!username) throw new ValidationError(404, 'Username should be provided');

        const email = await this.profileRepo
            .findByUserUsername(username)
            .then((res) => res?.user.email);
        if (!email) throw new AuthError(404, 'Email not found');

        const hashedPassword = await bcrypt.hash(password, 10);
        return await this.authRepo.editPassword(email, hashedPassword);
    };

    verifyEmail = async (userVerificationToken: string) => {
        const verificationToken = await this.authRepo.findByToken(userVerificationToken);

        if (!verificationToken) throw new AuthError(404, 'Token not found');
        if (verificationToken.expirationTime.getTime() < new Date(Date.now()).getTime())
            throw new AuthError(401, 'Token expired');

        const validUser = await this.authRepo.verifyEmail(
            verificationToken.user.email,
            verificationToken.token
        );

        const token = this.generateJwtToken(validUser.id);

        const user = await this.authRepo.findByIdWithProfileAndLastfmIntegration(
            verificationToken.user.id
        );
        if (!user) throw new AuthError(404, 'user does not exists');

        const refreshToken = this.generateToken();
        const refresh = await this.authRepo.createRefreshToken(refreshToken, user?.email);

        return {
            token,
            refresh: refresh.token,
            username: user?.profile?.username,
            id: validUser.id,
        };
    };

    refresh = async (token: string) => {
        const refreshToken = await this.authRepo.findRefreshToken(token);
        if (!refreshToken) throw new AuthError(401, 'Token not found');

        if (refreshToken.expirationTime.getTime() < new Date(Date.now()).getTime()) {
            throw new AuthError(401, 'Token expired');
        }

        await this.authRepo.deleteRefreshToken(refreshToken.token);

        const newRefreshToken = this.generateToken();
        const refresh = await this.authRepo.createRefreshToken(
            newRefreshToken,
            refreshToken.user.email
        );

        const accessToken = this.generateJwtToken(refreshToken.userId);

        return { accessToken, refresh: refresh.token };
    };

    deleteRefreshToken = async (token: string) => {
        const refreshToken = await this.authRepo.findRefreshToken(token ?? '');
        if (!refreshToken) return;

        return await this.authRepo.deleteRefreshToken(refreshToken.token);
    };

    private instantiateChildLogger = ({
        userId,
        email,
        username,
    }: {
        userId?: string | undefined;
        email?: string | undefined;
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
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) throw new ValidationError(404, 'Email or password incorrect');

        return user;
    };

    private generateToken = () => {
        return randomBytes(32).toString('hex');
    };

    private generateJwtToken = (id: string) => {
        return jwt.sign({ id }, env.SECRET_JWT as jwt.Secret, {
            expiresIn: '1h',
        });
    };

    private sendMail = async (to: string, subject: string, html: string) => {
        await resend.emails.send({
            from: 'noreply@albumguessnr.com',
            to,
            subject,
            html,
        });
    };

    private generateUser = (email: string, hashedPassword: string) => {
        const newUser: UserCreateInput = {
            email,
            password: hashedPassword,
            emailVerified: false,
            createdAt: new Date(),
        };
        return newUser;
    };

    private sendTokenToEmail = async (email: string) => {
        await this.authRepo.deleteTokens(email);
        const token = this.generateToken();
        const userVerificationToken = await this.authRepo.createVerificationToken(token, email);
        const verificationToken = userVerificationToken.token;

        const childLogger = this.instantiateChildLogger({ email });
        this.sendMail(
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
}

export default AuthService;

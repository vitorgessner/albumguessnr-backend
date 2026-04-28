import bcrypt from 'bcryptjs';
import type { User } from '../../generated/prisma/client.js';
import ValidationError from '../../shared/errors/ValidationError.js';
import type AuthRepository from './AuthRepository.js';
import { randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import transporter from './utils/transporter.js';
import AuthError from './errors/AuthError.js';
import type { UserCreateInput } from '../../generated/prisma/models.js';
import { env } from '../../shared/config/env.js';

class AuthService {
    private authRepo: AuthRepository;
    constructor(authRepo: AuthRepository) {
        this.authRepo = authRepo;
    }

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

        return me;
    };

    login = async (email: string, password: string) => {
        const user = await this.validateEmail(email);
        const validUser = await this.validatePassword(user, password);

        const refreshToken = this.generateToken();
        const refresh = await this.authRepo.createRefreshToken(refreshToken, email);

        const token = this.generateJwtToken(validUser.id);

        return { token, refresh: refresh.token };
    };

    register = async (email: string, password: string) => {
        if (!email) throw new ValidationError(400, 'Email is required');
        if (!password) throw new ValidationError(400, 'Password is required');

        const emailExists = await this.authRepo.findByEmail(email);
        if (emailExists) {
            try {
                await this.sendMail(
                    email,
                    'Account creation attempt',
                    // eslint-disable-next-line max-len
                    'Someone tried to create an account with your email. If it was you, try logging in'
                );
            } catch (err) {
                console.log(err);
            }
            return { status: 'success' };
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = this.generateUser(email, hashedPassword);

        await this.authRepo.create(newUser);

        await this.sendTokenToEmail(email);

        return { status: 'success' };
    };

    resendEmail = async (email: string) => {
        if (!email) throw new ValidationError(400, 'Email is required');

        const emailExists = await this.authRepo.findByEmail(email);
        if (!emailExists) return;

        try {
            if (!emailExists.emailVerified) {
                return await this.sendTokenToEmail(email);
            }

            return await this.sendMail(
                email,
                'Email already verified',
                'Your email is already verified, please try logging in'
            );
        } catch (err) {
            console.log(err);
        }
        return { status: 'success' };
    };

    forgot = async (email: string) => {
        if (!email) throw new ValidationError(400, 'Email is required');

        const emailExists = await this.authRepo.findByEmail(email);
        if (!emailExists) return;

        const username = await this.authRepo.findByEmail(email);

        try {
            await this.sendMail(
                email,
                'Forgot your password',
                '',
                `<div>Please click on the link below to change your password. 
                If it was not you, be worried</div>
                <a href=
                "${env.FRONTEND_URL}/auth/${username?.profile?.username}/passwordChange">
                Change your password
                </a>`
            );
        } catch (err) {
            console.log(err);
        }
        return { status: 'success' };
    };

    editPassword = async (username: string, password: string) => {
        if (!username) throw new ValidationError(404, 'Username should be provided');

        const email = await this.authRepo.findByUsername(username).then((res) => res?.user.email);
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

        return { token, username: user?.profile?.username, id: validUser.id };
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
        const refreshToken = await this.authRepo.findRefreshToken(token);
        if (!refreshToken) return;

        return await this.authRepo.deleteRefreshToken(refreshToken.token);
    };

    private validateEmail = async (email: string) => {
        const user = await this.authRepo.findByEmail(email);

        if (!user) throw new ValidationError(404, 'Email or password incorrect');
        if (!user.emailVerified) throw new AuthError(401, 'Email not verified');

        return user;
    };

    private validatePassword = async (user: User, password: string) => {
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

    private sendMail = (to: string, subject: string, text: string, html?: string) => {
        return new Promise((resolve, reject) => {
            transporter.sendMail(
                {
                    from: env.EMAIL,
                    to,
                    subject,
                    text,
                    html,
                },
                (error, info) => {
                    if (error) return reject(error);
                    return resolve(info.response);
                }
            );
        });
    };

    private generateUser = (email: string, hashedPassword: string) => {
        const newUser: UserCreateInput = {
            email,
            password: hashedPassword,
            emailVerified: false,
            createdAt: new Date(),
            // lastfmIntegrationId: null,
        };
        return newUser;
    };

    private sendTokenToEmail = async (email: string) => {
        await this.authRepo.deleteTokens(email);
        const token = this.generateToken();
        const userVerificationToken = await this.authRepo.createVerificationToken(token, email);
        await this.sendMail(
            email,
            'Verify your account',
            'Please click on the link below to verify your account',

            `<a href="${env.BASE_URL}/verify/${userVerificationToken.token}">Verify your email</a>`
        );
    };
}

export default AuthService;

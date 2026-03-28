import bcrypt from 'bcryptjs';
import type { User } from '../../generated/prisma/client.js';
import ValidationError from '../../shared/errors/ValidationError.js';
import type AuthRepository from './AuthRepository.js';
import { randomUUID, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import transporter from './utils/transporter.js';
import AuthError from './errors/AuthError.js';

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
        const users = await this.authRepo.findAllWIthProfile();

        return users;
    };

    me = async (id: string) => {
        const me = await this.authRepo.findByIdWithProfile(id);

        return me;
    };

    login = async (email: string, password: string) => {
        const user = await this.validateEmail(email);
        const validUser = await this.validatePassword(user, password);

        const token = jwt.sign({ id: validUser.id }, process.env.SECRET_JWT as jwt.Secret, {
            expiresIn: '1h',
        });

        return token;
    };

    register = async (email: string, password: string) => {
        if (!email) throw new ValidationError(400, 'Email is required');
        if (!password) throw new ValidationError(400, 'Password is required');

        const emailExists = await this.authRepo.findByEmail(email);
        if (emailExists) {
            try {
                this.sendMail(
                    email,
                    'Account creation attempt',
                    // eslint-disable-next-line max-len
                    'Someone tried to create an account with your email. If it was you, try logging in'
                );
                return null;
            } catch (err) {
                console.log(err);
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = this.generateUser(email, hashedPassword);

        await this.authRepo.create(newUser);

        this.sendTokenToEmail(email);

        return { status: 'success' };
    };

    resendEmail = async (email: string) => {
        if (!email) throw new ValidationError(400, 'Email is required');

        const emailExists = await this.authRepo.findByEmail(email);
        if (emailExists) {
            if (!emailExists.emailVerifies) {
                this.sendTokenToEmail(email);
            } else {
                this.sendMail(
                    email,
                    'Email already verified',
                    'Your email is already verified, please try logging in'
                );
            }
        }
        return { status: 'success' };
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

        const token = jwt.sign({ id: validUser.id }, process.env.SECRET_JWT as jwt.Secret, {
            expiresIn: '1h',
        });

        return { token, userId: verificationToken.user.id };
    };

    private validateEmail = async (email: string) => {
        const user = await this.authRepo.findByEmail(email);

        if (!user) throw new ValidationError(404, 'Email or password incorrect');
        if (!user.emailVerifies) throw new AuthError(401, 'Email not verified');

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

    private sendMail = (to: string, subject: string, text: string, html?: string) => {
        transporter.sendMail(
            {
                from: process.env.EMAIL,
                to,
                subject,
                text,
                html,
            },
            (error, info) => {
                if (error) return console.log(error);
                return console.log(`Email sent: ${info.response}`);
            }
        );
    };

    private generateUser = (email: string, hashedPassword: string) => {
        const newUser: User = {
            id: randomUUID(),
            email,
            password: hashedPassword,
            emailVerifies: false,
            createdAt: new Date(),
        };
        return newUser;
    };

    private sendTokenToEmail = async (email: string) => {
        await this.authRepo.deleteTokens(email);
        const token = this.generateToken();
        const userVerificationToken = await this.authRepo.createVerificationToken(token, email);
        this.sendMail(
            email,
            'Verify your account',
            'Please click on the link below to verify your account',
            // eslint-disable-next-line max-len
            `<a href="${process.env.BASE_URL}/verify/${userVerificationToken.token}">Verify your email</a>`
        );
    };
}

export default AuthService;

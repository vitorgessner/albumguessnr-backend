import bcrypt from 'bcryptjs';
import type { User } from '../../generated/prisma/client.js';
import ValidationError from '../../shared/errors/ValidationError.js';
import type AuthRepository from './AuthRepository.js';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';

class AuthService {
    private authRepo: AuthRepository;
    constructor(authRepo: AuthRepository) {
        this.authRepo = authRepo;
    }

    login = async (email: string, password: string) => {
        const user = await this.validateEmail(email);
        const validUser = await this.validatePassword(user, password);

        const token = jwt.sign({ id: validUser.id }, process.env.SECRET_JWT as jwt.Secret, {
            expiresIn: '1h',
        });

        return { validUser, token };
    };

    create = async (email: string, password: string) => {
        if (!email) throw new ValidationError(400, 'Email is required');
        if (!password) throw new ValidationError(400, 'Password is required');
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser: User = {
            id: randomUUID(),
            email,
            password: hashedPassword,
            createdAt: new Date(),
        };

        const token = jwt.sign({ id: newUser.id }, process.env.SECRET_JWT as jwt.Secret, {
            expiresIn: '1h',
        });

        const user = await this.authRepo.create(newUser);
        return { user, token };
    };

    private validateEmail = async (email: string) => {
        const user = await this.authRepo.findByEmail(email);

        if (!user) throw new ValidationError(404, 'Email or password incorrect');
        return user;
    };

    private validatePassword = async (user: User, password: string) => {
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) throw new ValidationError(404, 'Email or password incorrect');

        return user;
    };
}

export default AuthService;

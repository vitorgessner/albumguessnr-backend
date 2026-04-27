import * as z from 'zod';
import ValidationError from '../shared/errors/ValidationError.js';

const Env = z.object({
    PORT: z.preprocess((val) => Number(val), z.int().min(3000).max(3000)),
    DATABASE_URL: z.string().startsWith('postgresql://postgres').endsWith('?pgbouncer=true'),
    DIRECT_URL: z.string().startsWith('postgresql://postgres'),
    SECRET_JWT: z.string().min(50),
    EMAIL: z.email(),
    PASSWORD: z.string().min(19),
    API_KEY: z.string().min(32),
    NODE_ENV: z.string().min(3),
});

const Dev = Env.extend({
    FRONTEND_URL: z.string().startsWith('http://localhost:5173'),
    BASE_URL: z.string().startsWith('http://localhost:3000'),
});

const Prod = Env.extend({
    FRONTEND_URL: z.string().startsWith('https://albumguessnr.com'),
    BASE_URL: z.string().startsWith('https://api.albumguessnr.com'),
});

const validateEnv = (mode: string | undefined) => {
    if (!mode)
        throw new ValidationError(
            404,
            'NODE_ENV is not defined in .env, please define it with either "dev" or "prod"'
        );
    return mode === 'dev' ? Dev.parse(process.env) : Prod.parse(process.env);
};

export default validateEnv;

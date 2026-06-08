import * as z from 'zod';
import ValidationError from '../shared/errors/ValidationError.js';
import { initialLogger } from './logger/initialLogger.js';
import { sanitizeError } from '../shared/utils/sanitizeCause.js';

const Env = z.object({
    PORT: z.preprocess((val) => Number(val), z.int()),
    DATABASE_URL: z.string().includes('postgresql://').includes('6543'),
    DIRECT_URL: z.string().includes('postgresql://'),
    SUPABASE_URL: z.string().includes('.supabase.co'),
    SUPABASE_API_KEY: z.string().min(40),
    SECRET_JWT: z.string().min(50),
    RESEND_API_KEY: z.string(),
    API_KEY: z.string().min(32),
    NODE_ENV: z.string().min(3),
    LOG_LEVEL: z.string().min(4),
    DEFAULT_AVATAR: z.string().startsWith('https://'),
});

const Dev = Env.extend({
    FRONTEND_URL: z.string().startsWith('http://localhost:5173'),
    BASE_URL: z.string().startsWith('http://localhost:3000'),
});

const Prod = Env.extend({
    FRONTEND_URL: z.string().startsWith('https://'),
    BASE_URL: z.string().startsWith('https://'),
});

const validateEnv = (mode: string | undefined) => {
    initialLogger.info('STARTING environment variables validation');
    if (!mode)
        throw new ValidationError(
            404,
            'NODE_ENV is not defined in .env, please define it with either "dev" or "production"'
        );
    try {
        return mode === 'dev' ? Dev.parse(process.env) : Prod.parse(process.env);
    } catch (err) {
        initialLogger.error(
            new ValidationError(500, 'ERROR validating environment variables', {
                cause: sanitizeError(err),
            })
        );
        process.exit(1);
    }
};

export default validateEnv;

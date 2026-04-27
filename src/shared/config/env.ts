import 'dotenv/config';
import validateEnv from '../../config/validateEnv.js';

export const env = validateEnv(process.env.NODE_ENV);

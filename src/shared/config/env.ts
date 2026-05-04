import 'dotenv/config';
import validateEnv from '../../config/validateEnv.js';

console.log(process.env.FRONTEND_URL);
export const env = validateEnv(process.env.NODE_ENV);

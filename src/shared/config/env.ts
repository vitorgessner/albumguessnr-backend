import 'dotenv/config';
import validateEnv from '../../config/validateEnv.js';
import { initialLogger } from '../../config/logger/initialLogger.js';

export const env = validateEnv(process.env.NODE_ENV);
initialLogger.info('SUCCESS validating environment variables');

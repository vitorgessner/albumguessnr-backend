import dotenv from 'dotenv';
import { env } from '../shared/config/env.js';

dotenv.config();

interface IConfig {
    port: number;
}

const config: IConfig = {
    port: Number(env.PORT) || 3000,
};

export default config;

import axios from 'axios';
import { env } from '../../src/shared/config/env.js';

const axiosInstance = axios.create({
    baseURL: 'http://ws.audioscrobbler.com/2.0/',
    params: {
        api_key: env.API_KEY,
        format: 'json',
    },
});

export default axiosInstance;

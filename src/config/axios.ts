import axios from 'axios';
import { env } from '../../src/shared/config/env.js';

const axiosInstance = axios.create({
    baseURL: 'http://ws.audioscrobbler.com/2.0/',
    params: {
        api_key: env.API_KEY,
        format: 'json',
    },
    headers: {
        'User-Agent': 'AlbumGuessnr/0.0.0 ( gessnervgg@gmail.com )',
    },
});

export default axiosInstance;

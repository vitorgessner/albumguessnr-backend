import axios from 'axios';

const axiosInstance = axios.create({
    baseURL: 'http://ws.audioscrobbler.com/2.0/',
    params: {
        api_key: process.env.API_KEY,
        format: 'json',
    },
});

export default axiosInstance;

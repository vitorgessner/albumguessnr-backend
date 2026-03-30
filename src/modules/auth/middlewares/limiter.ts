import { rateLimit } from 'express-rate-limit';

const setLimiter = (time: number, limit: number) => {
    const limiter = rateLimit({
        windowMs: 1000 * 60 * time,
        limit: limit,
    });

    return limiter;
};

export default setLimiter;

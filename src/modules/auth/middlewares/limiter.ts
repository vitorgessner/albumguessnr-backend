import { rateLimit } from 'express-rate-limit';
import type { Request, Response } from 'express';

const setLimiter = (time: number, limit: number) => {
    const limiter = rateLimit({
        windowMs: 1000 * 60 * time,
        limit: limit,
        handler: (req: Request, res: Response) => {
            res.status(429).json({
                status: 'failed',
                name: 'RateLimitError',
                statusCode: 429,
                message: 'Too many requests. Please wait before trying again.',
            });
        },
    });

    return limiter;
};

export default setLimiter;

import { Options, rateLimit } from 'express-rate-limit';
import type { NextFunction, Request, Response } from 'express';

const setLimiter = (time: number, limit: number) => {
    const limiter = rateLimit({
        windowMs: 1000 * 60 * time,
        limit: limit,
        legacyHeaders: false,
        handler: (req: Request, res: Response, next: NextFunction, options: Options) => {
            const baseRetryAfter = Math.ceil(options.windowMs / 1000);
            const randomJitter = Math.floor(Math.random() * 5) + 1;
            const jitteredRetryAfter = baseRetryAfter + randomJitter;

            res.setHeader('Retry-After', jitteredRetryAfter);
            res.status(429).json({
                status: 'failed',
                name: 'RateLimitError',
                statusCode: 429,
                message: 'Too many requests. Please wait before trying again.',
                retry_after: jitteredRetryAfter,
            });
        },
    });

    return limiter;
};

export default setLimiter;

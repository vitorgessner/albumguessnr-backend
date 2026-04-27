import type { NextFunction, Request, Response } from 'express';
import * as z from 'zod';
import ValidationError from '../../../shared/errors/ValidationError.js';

const validateBody = (schema: z.ZodType) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            schema.parse(req.body);

            next();
        } catch (err) {
            if (err instanceof z.ZodError) {
                next(new ValidationError(400, z.prettifyError(err)));
            }
        }
    };
};

export default validateBody;

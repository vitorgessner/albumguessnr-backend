import { LogService } from './LogService';
import type { Request, Response } from 'express';
import { UserAlbumErrorLogData } from './types/ErrorLogsTypes';
import AuthError from '../auth/errors/AuthError';
import ValidationError from '../../shared/errors/ValidationError';

export interface TypedRequestBody<T> extends Request {
    body: T;
}

export class LogController {
    constructor(private logService: LogService) {}

    saveUserAlbumErrorLog = async (req: TypedRequestBody<UserAlbumErrorLogData>, res: Response) => {
        const userId = req.params.userId;
        if (!userId) throw new AuthError(401, 'Unauthorized');
        if (typeof userId === 'object') throw new ValidationError(400, 'UserId should be a string');

        const { album, fieldsWithErrors, description } = req.body;

        await this.logService.saveUserAlbumErrorLog({
            userId,
            album,
            fieldsWithErrors,
            description,
        });

        res.status(200).json({
            status: 'success',
            message: 'Report sent. We will analyze it soon',
        });
    };
}

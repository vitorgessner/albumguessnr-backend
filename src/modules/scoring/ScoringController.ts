import type { Request, Response } from 'express';
import type ScoringService from './ScoringService.js';
import { basePointsAndExpectedTimePerCategory } from './utils/basePoints.js';
import ValidationError from '../../shared/errors/ValidationError.js';

class ScoringController {
    constructor(private scoringService: ScoringService) {}

    handleBestScore = async (req: Request, res: Response) => {
        res.status(200).json({
            status: 'deprecated',
            message: 'this route is deprecated, please use /guess',
        });
    };

    getPointsConfig = async (req: Request, res: Response) => {
        const albumId = req.params.albumId;
        if (!albumId) throw new ValidationError(400, 'No albumId passed');
        if (typeof albumId === 'object') throw new ValidationError(400, 'AlbumId must be a string');

        const tracksLength = await this.scoringService.getTracksLength(albumId).then((res) => res);

        const pointsConfig = basePointsAndExpectedTimePerCategory(tracksLength);

        res.status(200).json({
            status: 'success',
            message: 'Config fetched',
            config: pointsConfig,
        });
    };
}

export default ScoringController;

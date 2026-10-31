import { AnalyticsService } from './AnalyticsService';
import type { Request, Response } from 'express';

export class AnalyticsController {
    constructor(private analyticsService: AnalyticsService) {}

    incrementBlocked = async (_: Request, res: Response) => {
        const { date, blocked, checked } = await this.analyticsService.incrementBlocked();

        return res.status(200).json({
            status: 'success',
            message: 'Incremented adblock users',
            date,
            blocked,
            checked,
        });
    };

    incrementChecked = async (_: Request, res: Response) => {
        const { date, blocked, checked } = await this.analyticsService.incrementChecked();

        return res.status(200).json({
            status: 'success',
            message: 'Incremented non adblock users',
            date,
            blocked,
            checked,
        });
    };
}

import StatsService from './StatsService';
import type { Request, Response } from 'express';

class StatsController {
    constructor(private statsService: StatsService) {}

    getUserStats = async (req: Request, res: Response) => {
        const username = req.params.username;

        const userStats = await this.statsService.getUserStats(username);

        res.status(200).json({
            status: 'success',
            message: 'User stats fetched',
            stats: userStats,
        });
    };
}

export default StatsController;

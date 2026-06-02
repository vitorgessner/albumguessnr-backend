import type { Request, Response } from 'express';
import type LeaderboardsService from './LeaderboardsService.js';
import AuthError from '../auth/errors/AuthError.js';

class LeaderboardsController {
    constructor(private leaderboardsService: LeaderboardsService) {}

    getGlobalLeaderboard = async (req: Request, res: Response) => {
        const page = req.query.page;
        const period = req.params.period;

        const formattedPeriod = period && (period as string).toUpperCase();

        const { leaderboard, pages } = await this.leaderboardsService.getLeaderboard(
            (page as string) ?? 0,
            formattedPeriod as 'DAILY' | 'WEEKLY' | 'MONTHLY' | undefined
        );

        res.status(200).json({
            status: 'success',
            message: `Global leaderboard fetched on page ${page ?? 0}`,
            leaderboard,
            pages,
        });
    };

    getFriendsLeaderboard = async (req: Request, res: Response) => {
        const page = req.query.page;
        const userId = req.userId;
        if (!userId) throw new AuthError(401, 'Not logged in');

        const period = req.params.period;
        const formattedPeriod = period && (period as string).toUpperCase();

        const { leaderboard, pages } = await this.leaderboardsService.getLeaderboard(
            (page as string) ?? 0,
            formattedPeriod as 'DAILY' | 'WEEKLY' | 'MONTHLY' | undefined,
            userId
        );

        res.status(200).json({
            status: 'success',
            message: `Friends leaderboard fetched on page ${page ?? 0}`,
            leaderboard,
            pages,
        });
    };

    getPeriodGlobalLeaderboard = async (req: Request, res: Response) => {
        const page = req.query.page;
        const period = req.params.period;

        const formattedPeriod = period && (period as string).toUpperCase();

        const { leaderboard, pages } = await this.leaderboardsService.getLeaderboard(
            (page as string) ?? 0,
            formattedPeriod as 'DAILY' | 'WEEKLY' | 'MONTHLY' | undefined
        );

        res.status(200).json({
            status: 'success',
            message: `${period} global leaderboard fetched on page ${page ?? 0}`,
            leaderboard,
            pages,
        });
    };

    getPeriodFriendsLeaderboard = async (req: Request, res: Response) => {
        const page = req.query.page;
        const period = req.params.period;

        const userId = req.userId;
        if (!userId) throw new AuthError(401, 'Not logged in');

        const formattedPeriod = period && (period as string).toUpperCase();

        const { leaderboard, pages } = await this.leaderboardsService.getLeaderboard(
            (page as string) ?? 0,
            formattedPeriod as 'DAILY' | 'WEEKLY' | 'MONTHLY' | undefined,
            userId
        );

        res.status(200).json({
            status: 'success',
            message: `${period} friends leaderboard fetched on page ${page ?? 0}`,
            leaderboard,
            pages,
        });
    };

    getCategoryLeaderboard = async (req: Request, res: Response) => {
        const page = req.query.page;
        const category = req.params.category;
        const period = req.params.period;

        const formattedPeriod = period && (period as string).toUpperCase();

        const { leaderboard, pages } = await this.leaderboardsService.getCategoryLeaderboard(
            category as string,
            (page as string) ?? 0,
            formattedPeriod as 'DAILY' | 'WEEKLY' | 'MONTHLY' | undefined
        );

        res.status(200).json({
            status: 'success',
            message: `${category}'s leaderboard fetched on page ${page ?? 0}`,
            leaderboard,
            pages,
        });
    };

    getFriendsCategoryLeaderboard = async (req: Request, res: Response) => {
        const userId = req.userId;
        if (!userId) throw new AuthError(401, 'Not logged in');

        const page = req.query.page;
        const category = req.params.category;
        const period = req.params.period;

        const formattedPeriod = period && (period as string).toUpperCase();

        const { leaderboard, pages } = await this.leaderboardsService.getCategoryLeaderboard(
            category as string,
            (page as string) ?? 0,
            formattedPeriod as 'DAILY' | 'WEEKLY' | 'MONTHLY' | undefined,
            userId
        );

        res.status(200).json({
            status: 'success',
            message: `Friends ${category}'s leaderboard fetched on page ${page ?? 0}`,
            leaderboard,
            pages,
        });
    };

    getPeriodCategoryLeaderboard = async (req: Request, res: Response) => {
        const page = req.query.page;
        const category = req.params.category;
        const period = req.params.period;

        const formattedPeriod = period && (period as string).toUpperCase();

        const { leaderboard, pages } = await this.leaderboardsService.getCategoryLeaderboard(
            category as string,
            (page as string) ?? 0,
            formattedPeriod as 'DAILY' | 'WEEKLY' | 'MONTHLY' | undefined
        );

        res.status(200).json({
            status: 'success',
            message: `${period} ${category}'s leaderboard fetched on page ${page ?? 0}`,
            leaderboard,
            pages,
        });
    };

    getFriendsPeriodCategoryLeaderboard = async (req: Request, res: Response) => {
        const userId = req.userId;
        if (!userId) throw new AuthError(401, 'Not logged in');

        const page = req.query.page;
        const category = req.params.category;
        const period = req.params.period;

        const formattedPeriod = period && (period as string).toUpperCase();

        const { leaderboard, pages } = await this.leaderboardsService.getCategoryLeaderboard(
            category as string,
            (page as string) ?? 0,
            formattedPeriod as 'DAILY' | 'WEEKLY' | 'MONTHLY' | undefined,
            userId
        );

        res.status(200).json({
            status: 'success',
            message: `Friends ${period} ${category}'s leaderboard fetched on page ${page ?? 0}`,
            leaderboard,
            pages,
        });
    };

    getCategoryAccuracyLeaderboard = async (req: Request, res: Response) => {
        const page = req.query.page;
        const category = req.params.category;

        const period = req.params.period;
        const formattedPeriod = period && (period as string).toUpperCase();

        const { accuracyLeaderboard, pages } =
            await this.leaderboardsService.getCategoryAccuracyLeaderboard(
                category as string,
                (page as string) ?? 0,
                formattedPeriod as 'DAILY' | 'WEEKLY' | 'MONTHLY' | undefined
            );

        res.status(200).json({
            status: 'success',
            message: `${category}'s accuracy leaderboard fetched on page ${page ?? 0}`,
            leaderboard: accuracyLeaderboard,
            pages,
        });
    };

    getFriendsCategoryAccuracyLeaderboard = async (req: Request, res: Response) => {
        const userId = req.userId;
        if (!userId) throw new AuthError(401, 'Not logged in');

        const page = req.query.page;
        const category = req.params.category;

        const period = req.params.period;
        const formattedPeriod = period && (period as string).toUpperCase();

        const { accuracyLeaderboard, pages } =
            await this.leaderboardsService.getCategoryAccuracyLeaderboard(
                category as string,
                (page as string) ?? 0,
                formattedPeriod as 'DAILY' | 'WEEKLY' | 'MONTHLY' | undefined,
                userId
            );

        res.status(200).json({
            status: 'success',
            message: `Friends ${category}'s accuracy leaderboard fetched on page ${page ?? 0}`,
            leaderboard: accuracyLeaderboard,
            pages,
        });
    };

    getPeriodCategoryAccuracyLeaderboard = async (req: Request, res: Response) => {
        const page = req.query.page;
        const category = req.params.category;
        const period = req.params.period;

        const formattedPeriod = period && (period as string).toUpperCase();

        const { accuracyLeaderboard, pages } =
            await this.leaderboardsService.getCategoryAccuracyLeaderboard(
                category as string,
                (page as string) ?? 0,
                formattedPeriod as 'DAILY' | 'WEEKLY' | 'MONTHLY' | undefined
            );

        res.status(200).json({
            status: 'success',
            message: `${period} ${category}'s accuracy leaderboard fetched on page ${page ?? 0}`,
            leaderboard: accuracyLeaderboard,
            pages,
        });
    };

    getFriendsPeriodCategoryAccuracyLeaderboard = async (req: Request, res: Response) => {
        const userId = req.userId;
        if (!userId) throw new AuthError(401, 'Not logged in');

        const page = req.query.page;
        const category = req.params.category;
        const period = req.params.period;

        const formattedPeriod = period && (period as string).toUpperCase();

        const { accuracyLeaderboard, pages } =
            await this.leaderboardsService.getCategoryAccuracyLeaderboard(
                category as string,
                (page as string) ?? 0,
                formattedPeriod as 'DAILY' | 'WEEKLY' | 'MONTHLY' | undefined,
                userId
            );

        res.status(200).json({
            status: 'success',
            message: `Friends ${period} ${category}'s accuracy leaderboard fetched on page 
            ${page ?? 0}`,
            leaderboard: accuracyLeaderboard,
            pages,
        });
    };

    getTracklistAccuracyLeaderboard = async (req: Request, res: Response) => {
        const page = req.query.page;
        const period = req.params.period;

        const formattedPeriod = period && (period as string).toUpperCase();

        const { accuracyLeaderboard, pages } =
            await this.leaderboardsService.getTracklistAccuracyLeaderboard(
                (page as string) ?? 0,
                formattedPeriod as 'DAILY' | 'WEEKLY' | 'MONTHLY' | undefined
            );

        res.status(200).json({
            status: 'success',
            message: `Tracks' accuracy leaderboard fetched on page ${page ?? 0}`,
            leaderboard: accuracyLeaderboard,
            pages,
        });
    };

    getFriendsTracklistAccuracyLeaderboard = async (req: Request, res: Response) => {
        const userId = req.userId;
        if (!userId) throw new AuthError(401, 'Not logged in');

        const page = req.query.page;
        const period = req.params.period;

        const formattedPeriod = period && (period as string).toUpperCase();

        const { accuracyLeaderboard, pages } =
            await this.leaderboardsService.getTracklistAccuracyLeaderboard(
                (page as string) ?? 0,
                formattedPeriod as 'DAILY' | 'WEEKLY' | 'MONTHLY' | undefined,
                userId
            );

        res.status(200).json({
            status: 'success',
            message: `Friends tracks' accuracy leaderboard fetched on page ${page ?? 0}`,
            leaderboard: accuracyLeaderboard,
            pages,
        });
    };

    getPeriodTracklistAccuracyLeaderboard = async (req: Request, res: Response) => {
        const page = req.query.page;
        const period = req.params.period;

        const formattedPeriod = period && (period as string).toUpperCase();

        const { accuracyLeaderboard, pages } =
            await this.leaderboardsService.getTracklistAccuracyLeaderboard(
                (page as string) ?? 0,
                formattedPeriod as 'DAILY' | 'WEEKLY' | 'MONTHLY' | undefined
            );

        res.status(200).json({
            status: 'success',
            message: `${period} tracks' accuracy leaderboard fetched on page ${page ?? 0}`,
            leaderboard: accuracyLeaderboard,
            pages,
        });
    };

    getFriendsPeriodTracklistAccuracyLeaderboard = async (req: Request, res: Response) => {
        const userId = req.userId;
        if (!userId) throw new AuthError(401, 'Not logged in');
        const page = req.query.page;
        const period = req.params.period;

        const formattedPeriod = period && (period as string).toUpperCase();

        const { accuracyLeaderboard, pages } =
            await this.leaderboardsService.getTracklistAccuracyLeaderboard(
                (page as string) ?? 0,
                formattedPeriod as 'DAILY' | 'WEEKLY' | 'MONTHLY' | undefined,
                userId
            );

        res.status(200).json({
            status: 'success',
            message: `Friends ${period} tracks' accuracy leaderboard fetched on page ${page ?? 0}`,
            leaderboard: accuracyLeaderboard,
            pages,
        });
    };
}

export default LeaderboardsController;

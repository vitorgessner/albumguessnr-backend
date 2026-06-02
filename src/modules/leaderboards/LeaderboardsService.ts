import ValidationError from '../../shared/errors/ValidationError.js';
import type { CategoriesWithoutTracks } from './LeaderboardsRepository.js';
import type LeaderboardsRepository from './LeaderboardsRepository.js';
import { possibleFunctions } from './utils/possibleDateFunctions.js';

class LeaderboardsService {
    constructor(private leaderboardsRepo: LeaderboardsRepository) {}

    getLeaderboard = async (
        page: string,
        period?: 'DAILY' | 'WEEKLY' | 'MONTHLY',
        userId?: string
    ) => {
        const pageNumber = Number(page);

        if (period && period !== 'DAILY' && period !== 'WEEKLY' && period !== 'MONTHLY')
            throw new ValidationError(400, `Period ${period} not available`);

        const startDate = period ? possibleFunctions[period].start(new Date()) : undefined;
        const finalDate = period ? possibleFunctions[period].end(new Date()) : undefined;

        const leaderboard = await this.leaderboardsRepo.getLeaderboard(
            pageNumber,
            startDate,
            finalDate,
            userId
        );

        const pages = Math.ceil(Number(leaderboard[0]?.rows) / 50);

        const formattedLeaderboard = leaderboard.flatMap((l) => {
            return {
                ...l,
                rows: undefined,
                totalScore: Math.round(Number(l.totalScore ?? 0) / 100),
            };
        });

        return { leaderboard: formattedLeaderboard ?? null, pages };
    };

    getCategoryLeaderboard = async (
        category: string,
        page: string,
        period?: 'DAILY' | 'WEEKLY' | 'MONTHLY',
        userId?: string
    ) => {
        const pageNumber = Number(page);

        if (period && period !== 'DAILY' && period !== 'WEEKLY' && period !== 'MONTHLY')
            throw new ValidationError(400, `Period ${period} not available`);

        const startDate = period ? possibleFunctions[period].start(new Date()) : undefined;
        const finalDate = period ? possibleFunctions[period].end(new Date()) : undefined;

        const leaderboard = await this.leaderboardsRepo.getCategoryLeaderboard(
            category.toUpperCase(),
            pageNumber,
            startDate,
            finalDate,
            userId
        );

        const pages = Math.ceil(Number(leaderboard[0]?.rows) / 50);

        const formattedLeaderboard = leaderboard.flatMap((l) => {
            return {
                ...l,
                rows: undefined,
                totalScore: Math.round(Number(l.totalScore ?? 0) / 100),
            };
        });

        return { leaderboard: formattedLeaderboard, pages };
    };

    getCategoryAccuracyLeaderboard = async (
        category: string,
        page: string,
        period?: 'DAILY' | 'WEEKLY' | 'MONTHLY',
        userId?: string
    ) => {
        const pageNumber = Number(page);

        if (period && period !== 'DAILY' && period !== 'WEEKLY' && period !== 'MONTHLY')
            throw new ValidationError(400, `Period ${period} not available`);

        const startDate = period ? possibleFunctions[period].start(new Date()) : undefined;
        const finalDate = period ? possibleFunctions[period].end(new Date()) : undefined;

        const accuracyLeaderboard = await this.leaderboardsRepo.getCategoryAccuracyLeaderboard(
            category.toUpperCase() as CategoriesWithoutTracks,
            pageNumber,
            startDate,
            finalDate,
            userId
        );

        const pages = Math.ceil(Number(accuracyLeaderboard[0]?.rows) / 50);

        const formattedAccuracyLeaderboard = accuracyLeaderboard.flatMap((l) => {
            return {
                ...l,
                rows: undefined,
                accuracy: Number(l.accuracy) / 100,
            };
        });

        return { accuracyLeaderboard: formattedAccuracyLeaderboard, pages };
    };

    getTracklistAccuracyLeaderboard = async (
        page: string,
        period?: 'DAILY' | 'WEEKLY' | 'MONTHLY',
        userId?: string
    ) => {
        const pageNumber = Number(page);

        if (period && period !== 'DAILY' && period !== 'WEEKLY' && period !== 'MONTHLY')
            throw new ValidationError(400, `Period ${period} not available`);

        const startDate = period ? possibleFunctions[period].start(new Date()) : undefined;
        const finalDate = period ? possibleFunctions[period].end(new Date()) : undefined;

        const accuracyLeaderboard = await this.leaderboardsRepo.getTracklistAccuracyLeaderboard(
            pageNumber,
            startDate,
            finalDate,
            userId
        );

        const pages = Math.ceil(Number(accuracyLeaderboard[0]?.rows) / 50);

        const formattedAccuracyLeaderboard = accuracyLeaderboard.flatMap((l) => {
            return {
                ...l,
                rows: undefined,
                accuracy: Number(l.accuracy) / 100,
            };
        });

        return { accuracyLeaderboard: formattedAccuracyLeaderboard, pages };
    };
}

export default LeaderboardsService;

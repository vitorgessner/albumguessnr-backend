import ValidationError from '../../shared/errors/ValidationError';
import AuthRepository from '../auth/AuthRepository';
import AuthError from '../auth/errors/AuthError';
import StatsRepository from './StatsRepository';

class StatsService {
    constructor(
        private statsRepo: StatsRepository,
        private authRepo: AuthRepository
    ) {}

    getUserStats = async (username: string | string[] | undefined) => {
        if (!username) throw new ValidationError(400, 'Username not provided');
        if (typeof username === 'object')
            throw new ValidationError(400, 'Username must be a string');

        const user = await this.authRepo.findByUsername(username);
        if (!user) throw new AuthError(404, 'User with the username provided not found');

        const userStats = await this.statsRepo.getUserStats(user.userId);

        return userStats ?? null;
    };
}

export default StatsService;

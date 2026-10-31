import { AnalyticsRepository } from './AnalyticsRepository';

export class AnalyticsService {
    constructor(private analyticsRepo: AnalyticsRepository) {}

    incrementBlocked = async () => {
        return this.analyticsRepo.incrementBlocked();
    };

    incrementChecked = async () => {
        return this.analyticsRepo.incrementChecked();
    };
}

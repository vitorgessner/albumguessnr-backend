import { prisma } from '../../config/prisma';

export class AnalyticsRepository {
    constructor() {}

    incrementBlocked = async () => {
        return await prisma.adblockStat.upsert({
            where: {
                date: new Date(),
            },
            create: {
                date: new Date(),
                blocked: 1,
            },
            update: {
                date: new Date(),
                blocked: {
                    increment: 1,
                },
            },
        });
    };

    incrementChecked = async () => {
        return await prisma.adblockStat.upsert({
            where: {
                date: new Date(),
            },
            create: {
                date: new Date(),
                checked: 1,
            },
            update: {
                date: new Date(),
                checked: {
                    increment: 1,
                },
            },
        });
    };
}

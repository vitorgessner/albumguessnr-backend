import { prisma } from '../../../config/prisma';

export class ProviderRepository {
    findAllUserProviders = async (userId: string) => {
        return prisma.user.findUnique({
            where: {
                id: userId,
            },
            include: {
                accounts: true,
            },
        });
    };

    findMainProvider = async (userId: string) => {
        return prisma.user.findUnique({
            where: {
                id: userId,
            },
            select: {
                mainAccount: true,
            },
        });
    };

    deleteAccount = async (provider: string, providerAccountId: string) => {
        return await prisma.account.delete({
            where: {
                provider_providerAccountId: {
                    provider,
                    providerAccountId,
                },
            },
        });
    };
}

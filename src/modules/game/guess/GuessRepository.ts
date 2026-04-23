import { prisma } from '../../../config/prisma.js';

class GuessRepository {
    getTimesGuessed = async (userId: string, albumId: string) => {
        return await prisma.userAlbumStats.findUnique({
            where: {
                userId_albumId: {
                    userId,
                    albumId,
                },
            },
            select: {
                timesGuessed: true,
            },
        });
    };

    upsert = async (userId: string, albumId: string) => {
        return await prisma.userAlbumStats.upsert({
            where: {
                userId_albumId: {
                    userId,
                    albumId,
                },
            },
            create: {
                lastTimeGuessed: new Date(),
                timesGuessed: 1,
                userId,
                albumId,
            },
            update: {
                lastTimeGuessed: new Date(),
                timesGuessed: {
                    increment: 1,
                },
                userId,
                albumId,
            },
        });
    };
}

export default GuessRepository;

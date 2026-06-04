import { prisma } from '../../config/prisma.js';

class ProfileRepository {
    findByUserId = async (id: string) => {
        return await prisma.profile.findUnique({
            where: {
                userId: id,
            },
            include: {
                user: {
                    select: {
                        lastfmIntegration: true,
                        email: true,
                        userStats: true,
                        createdAt: true,
                        id: true,
                    },
                },
            },
        });
    };

    findByUserUsername = async (username: string) => {
        return await prisma.profile.findUnique({
            where: {
                username,
            },
            include: {
                user: {
                    select: {
                        lastfmIntegration: true,
                        email: true,
                        userStats: true,
                        createdAt: true,
                        id: true,
                    },
                },
            },
            omit: {
                updatedAt: true,
                userId: true,
                id: true,
            },
        });
    };

    edit = async (id: string, username: string, bio: string, avatar_url: string) => {
        return await prisma.profile.update({
            where: {
                id,
            },
            data: {
                username,
                bio,
                avatar_url,
            },
        });
    };
}

export default ProfileRepository;

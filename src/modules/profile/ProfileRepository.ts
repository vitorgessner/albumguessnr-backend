import { prisma } from '../../config/prisma.js';

class ProfileRepository {
    findByUserId = async (id: string) => {
        return await prisma.profile.findUnique({
            where: {
                userId: id,
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
                        lastfmIntegration: {
                            select: {
                                lastfmUsername: true,
                            },
                        },
                        createdAt: true,
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

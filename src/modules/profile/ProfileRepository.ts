import { prisma } from '../../config/prisma.js';

class ProfileRepository {
    findByUserId = async (id: string) => {
        return await prisma.profile.findUnique({
            where: {
                userId: id,
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

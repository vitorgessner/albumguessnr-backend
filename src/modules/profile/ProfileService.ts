import AuthError from '../auth/errors/AuthError.js';
import type ProfileRepository from './ProfileRepository.js';

class ProfileService {
    private profileRepo: ProfileRepository;
    constructor(profileRepo: ProfileRepository) {
        this.profileRepo = profileRepo;
    }

    edit = async (id: string, username: string, bio: string, avatar_url?: string) => {
        const defaultAvatar = `${process.env.BASE_URL}/profilePictures/default.svg`;
        const profileId = await this.getProfileId(id);
        if (!profileId) throw new AuthError(404, 'Profile not found');

        return await this.profileRepo.edit(profileId, username, bio, avatar_url ?? defaultAvatar);
    };

    getProfileId = async (id: string) => {
        const profile = await this.profileRepo.findByUserId(id);
        if (!profile) return null;

        return profile?.id;
    };
}

export default ProfileService;

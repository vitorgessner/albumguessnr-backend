import AuthError from '../auth/errors/AuthError.js';
import type ProfileRepository from './ProfileRepository.js';

class ProfileService {
    private profileRepo: ProfileRepository;
    constructor(profileRepo: ProfileRepository) {
        this.profileRepo = profileRepo;
    }

    edit = async (id: string, username: string, bio: string, avatar_url?: string) => {
        const profile = await this.getProfile(id);
        if (!profile) throw new AuthError(404, 'Profile not found');

        const defaultAvatar =
            profile.avatar_url ?? `${process.env.BASE_URL}/profilePictures/default.svg`;

        return await this.profileRepo.edit(profile.id, username, bio, avatar_url ?? defaultAvatar);
    };

    getProfile = async (id: string) => {
        const profile = await this.profileRepo.findByUserId(id);
        if (!profile) return null;

        return profile;
    };
}

export default ProfileService;

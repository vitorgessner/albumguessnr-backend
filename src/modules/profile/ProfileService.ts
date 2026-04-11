import AuthError from '../auth/errors/AuthError.js';
import type ProfileRepository from './ProfileRepository.js';
import fs from 'fs';
import path from 'path';

class ProfileService {
    private profileRepo: ProfileRepository;
    constructor(profileRepo: ProfileRepository) {
        this.profileRepo = profileRepo;
    }

    edit = async (id: string, username: string, bio: string, avatar_url?: string) => {
        const profile = await this.getProfile(id);
        if (!profile) throw new AuthError(404, 'Profile not found');

        console.log(avatar_url);

        const defaultAvatar =
            profile.avatar_url ?? `${process.env.BASE_URL}/profilePictures/default.svg`;

        if (avatar_url) {
            const len = profile.avatar_url.split('/').length;
            const avatar = profile.avatar_url.split('/')[len - 1];
            if (!avatar) return null;
            if (avatar !== 'default.svg') {
                fs.unlink(path.join('public', 'profilePictures', avatar), (err) => {
                    if (err) console.log(err);
                    return;
                });
            }
        }

        const trimmedUsername = username.trim();

        console.log(avatar_url);

        return await this.profileRepo.edit(
            profile.id,
            trimmedUsername,
            bio,
            avatar_url ?? defaultAvatar
        );
    };

    getProfile = async (id: string) => {
        const profile = await this.profileRepo.findByUserId(id);
        if (!profile) return null;

        return profile;
    };
}

export default ProfileService;

import AuthError from '../auth/errors/AuthError.js';
import type ProfileRepository from './ProfileRepository.js';
import winston from 'winston';
import { sanitizeError } from '../../shared/utils/sanitizeCause.js';
import { SupabaseClient } from '@supabase/supabase-js';

class ProfileService {
    constructor(
        private profileRepo: ProfileRepository,
        private logger: winston.Logger,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        private supabase: SupabaseClient<any, 'public', 'public', any, any>
    ) {}

    getProfile = async (id: string) => {
        const profile = await this.profileRepo.findByUserId(id);
        if (!profile) return null;

        return profile;
    };

    getProfileByUsername = async (username: string) => {
        const profile = await this.profileRepo.findByUserUsername(username);
        if (!profile || !profile.user.userStats) return null;

        profile.user.userStats.totalScore = Math.round(profile.user.userStats.totalScore / 100);

        return profile;
    };

    edit = async (id: string, username: string, bio: string, file?: Express.Multer.File) => {
        const profile = await this.getProfile(id);
        if (!profile) throw new AuthError(404, 'Profile not found');

        const defaultAvatar =
            profile.avatar_url ??
            // eslint-disable-next-line max-len
            'https://hdidgrauakxbjamfaiah.supabase.co/storage/v1/object/public/profilePictures/uploads/default.svg';

        const trimmedUsername = username.trim();

        if (!file) {
            await this.profileRepo.edit(profile.id, trimmedUsername, bio, defaultAvatar);
            return { publicUrl: defaultAvatar };
        }

        const newFileExtension = file.originalname.split('.').pop();

        const fileName = `${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 9)}.${newFileExtension}`;

        const newFilePath = `uploads/${fileName}`;

        const length = profile.avatar_url.split('/').length;
        const oldFileName = profile.avatar_url.split('/')[length - 1];

        if (oldFileName && oldFileName !== 'default.svg') {
            await this.supabase.storage.from('profilePictures').remove([`uploads/${oldFileName}`]);
        }

        const { data, error } = await this.supabase.storage
            .from('profilePictures')
            .upload(newFilePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false,
            });

        if (error)
            throw new AuthError(500, 'Failed to save image', { cause: sanitizeError(error) });

        const { data: publicUrlData } = this.supabase.storage
            .from('profilePictures')
            .getPublicUrl(newFilePath);

        await this.profileRepo.edit(profile.id, trimmedUsername, bio, publicUrlData.publicUrl);

        return { path: data.path, publicUrl: publicUrlData.publicUrl };
    };
}

export default ProfileService;

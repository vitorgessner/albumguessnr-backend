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

        const newFilePath = this.getNewFilePath(file);
        const oldFileName = this.getOldFileName(profile.avatar_url);

        if (oldFileName && oldFileName !== 'default.svg') {
            await this.supabase.storage.from('profilePictures').remove([`uploads/${oldFileName}`]);
        }

        const data = await this.uploadToStorage(newFilePath, file);
        const url = await this.getImageUrl(newFilePath);

        await this.profileRepo.edit(profile.id, trimmedUsername, bio, url);

        return { path: data.path, publicUrl: url };
    };

    private getNewFilePath = (file: Express.Multer.File) => {
        const newFileExtension = file.originalname.split('.').pop();

        const fileName = `${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 9)}.${newFileExtension}`;

        return `uploads/${fileName}`;
    };

    private getOldFileName = (imageUrl: string) => {
        const length = imageUrl.split('/').length;
        return imageUrl.split('/')[length - 1];
    };

    private uploadToStorage = async (newFilePath: string, file: Express.Multer.File) => {
        const { data, error } = await this.supabase.storage
            .from('profilePictures')
            .upload(newFilePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false,
            });

        if (error)
            throw new AuthError(500, 'Failed to save image', { cause: sanitizeError(error) });

        return data;
    };

    private getImageUrl = async (newFilePath: string) => {
        const { data: publicUrlData } = this.supabase.storage
            .from('profilePictures')
            .getPublicUrl(newFilePath);

        return publicUrlData.publicUrl;
    };
}

export default ProfileService;

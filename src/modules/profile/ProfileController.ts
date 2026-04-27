import type { Request, Response } from 'express';
import type ProfileService from './ProfileService.js';
import AuthError from '../auth/errors/AuthError.js';
import { env } from '../../shared/config/env.js';

class ProfileController {
    private profileService: ProfileService;
    constructor(profileService: ProfileService) {
        this.profileService = profileService;
    }

    edit = async (req: Request, res: Response) => {
        const { username, bio } = req.body;
        const userId = req.userId;
        if (!userId) throw new AuthError(401, 'Not authenticated');

        const file = req.file;
        if (file) {
            const path = `${env.BASE_URL}/profilePictures/${file?.filename}`;
            await this.profileService.edit(userId, username, bio, path);
        }

        if (!file) {
            await this.profileService.edit(userId, username, bio);
        }

        res.status(200).json({ status: 'success', message: 'Profile changed' });
    };
}

export default ProfileController;

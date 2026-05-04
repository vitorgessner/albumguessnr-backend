import type { Request, Response } from 'express';
import type ProfileService from './ProfileService.js';
import AuthError from '../auth/errors/AuthError.js';
import { env } from '../../shared/config/env.js';
import ValidationError from '../../shared/errors/ValidationError.js';

class ProfileController {
    private profileService: ProfileService;
    constructor(profileService: ProfileService) {
        this.profileService = profileService;
    }

    getProfile = async (req: Request, res: Response) => {
        const { username } = req.params;
        if (!username || username.length < 1)
            throw new ValidationError(400, 'Username should be on query param');

        const user = await this.profileService.getProfileByUsername(username as string);
        if (!user)
            return res
                .status(200)
                .json({ status: 'success', message: 'User data fetched', user: null });

        return res.status(200).json({ status: 'success', message: 'User data fetched', user });
    };

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

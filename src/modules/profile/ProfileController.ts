import type { Request, Response } from 'express';
import type ProfileService from './ProfileService.js';
import AuthError from '../auth/errors/AuthError.js';

class ProfileController {
    private profileService: ProfileService;
    constructor(profileService: ProfileService) {
        this.profileService = profileService;
    }

    edit = async (req: Request, res: Response) => {
        const { username, bio, avatar_url } = req.body;
        const userId = req.userId;
        if (!userId) throw new AuthError(401, 'Not authenticated');

        await this.profileService.edit(userId, username, bio, avatar_url);

        res.status(200).json({ status: 'success', message: 'Profile changed' });
    };
}

export default ProfileController;

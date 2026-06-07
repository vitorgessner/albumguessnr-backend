import type { Request, Response } from 'express';
import type ProfileService from './ProfileService.js';
import AuthError from '../auth/errors/AuthError.js';
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

        const profile = await this.profileService.getProfileByUsername(username as string);
        if (!profile)
            return res
                .status(200)
                .json({ status: 'success', message: 'Profile data fetched', profile: null });

        return res.status(200).json({ status: 'success', message: 'User data fetched', profile });
    };

    edit = async (req: Request, res: Response) => {
        const { username, bio } = req.body;
        const userId = req.userId;
        if (!userId) throw new AuthError(401, 'Not authenticated');

        const file = req.file;
        const { path, publicUrl } = await this.profileService.edit(userId, username, bio, file);

        return res
            .status(200)
            .json({ status: 'success', message: 'Profile changed', path, publicUrl });
    };
}

export default ProfileController;

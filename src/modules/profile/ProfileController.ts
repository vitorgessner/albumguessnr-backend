import type { Request, Response } from 'express';
import type ProfileService from './ProfileService.js';
import AuthError from '../auth/errors/AuthError.js';

class ProfileController {
    private profileService: ProfileService;
    constructor(profileService: ProfileService) {
        this.profileService = profileService;
    }

    edit = async (req: Request, res: Response) => {
        const { username, bio } = req.body;
        const userId = req.userId;
        const file = req.file;
        const path = `${process.env.BASE_URL}/profilePictures/${file?.filename}`;

        if (!userId) throw new AuthError(401, 'Not authenticated');

        await this.profileService.edit(userId, username, bio, path);

        res.status(200).json({ status: 'success', message: 'Profile changed' });
    };
}

export default ProfileController;

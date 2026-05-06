import type { Request, Response } from 'express';
import type FriendsService from './FriendsService.js';
import AuthError from '../auth/errors/AuthError.js';
import ValidationError from '../../shared/errors/ValidationError.js';

class FriendsController {
    constructor(private friendsService: FriendsService) {}

    getFriends = async (req: Request, res: Response) => {
        const userId = req.userId;
        if (!userId) throw new AuthError(401, 'Not logged in');

        const friends = await this.friendsService.getFriends(userId);

        return res.status(200).json({ status: 'success', message: 'Friends fetched', friends });
    };

    makeRequest = async (req: Request, res: Response) => {
        const userId = req.userId;
        const { requestedUserId } = req.params;

        if (!userId) throw new AuthError(401, 'Not logged in');
        if (!requestedUserId)
            throw new ValidationError(400, 'You have to include a user to make a request');

        const request = await this.friendsService.makeRequest(userId, requestedUserId as string);

        if (!('length' in request))
            return res.status(200).json({ status: 'success', message: 'Request made', request });

        return res.status(200).json({ status: 'success', message: 'You are now friends', request });
    };

    acceptRequest = async (req: Request, res: Response) => {
        const userId = req.userId;
        const { requesterUserId } = req.params;

        if (!userId) throw new AuthError(401, 'Not logged in');
        if (!requesterUserId)
            throw new ValidationError(
                400,
                'A user has to make a request to you for you to accept it'
            );

        await this.friendsService.acceptRequest(userId, requesterUserId as string);
        res.status(200).json({ status: 'success', message: 'You are now friends' });
    };

    denyRequest = async (req: Request, res: Response) => {
        const userId = req.userId;
        const { requesterUserId } = req.params;

        if (!userId) throw new AuthError(401, 'Not logged in');
        if (!requesterUserId)
            throw new ValidationError(
                400,
                'A user has to make a request to you for you to deny it'
            );

        await this.friendsService.denyRequest(userId, requesterUserId as string);
        res.status(200).json({ status: 'success', message: 'You denied the request' });
    };

    unfriend = async (req: Request, res: Response) => {
        const userId = req.userId;
        const { friendId } = req.params;

        if (!userId) throw new AuthError(401, 'Not logged in');
        if (!friendId) throw new ValidationError(400, 'You have to include a user to unfriend');

        await this.friendsService.unfriend(userId, friendId as string);
        res.status(200).json({ status: 'success', message: 'You two are now unfriended' });
    };
}

export default FriendsController;

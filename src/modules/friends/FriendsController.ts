import type { Request, Response } from 'express';
import type FriendsService from './FriendsService.js';
import AuthError from '../auth/errors/AuthError.js';
import ValidationError from '../../shared/errors/ValidationError.js';

class FriendsController {
    constructor(private friendsService: FriendsService) {}

    getFriends = async (req: Request, res: Response) => {
        const username = req.params.username;

        if (!username) throw new ValidationError(400, 'No user provided');

        const friends = await this.friendsService.getFriends(username as string);

        return res.status(200).json({ status: 'success', message: 'Friends fetched', friends });
    };

    getFriendsWithAlbum = async (req: Request, res: Response) => {
        const id = req.userId;
        const albumId = req.params.albumId;

        if (!id) throw new ValidationError(401, 'Not logged in');
        if (!albumId) throw new ValidationError(400, 'No album id provided');

        const friends = await this.friendsService.getFriendsWithAlbum(id, albumId as string);

        return res.status(200).json({
            status: 'success',
            message: 'Friends that guessed the album fetched',
            friends,
        });
    };

    getStatus = async (req: Request, res: Response) => {
        const userId = req.userId;
        const username = req.params.username;

        if (!username) throw new ValidationError(400, 'No user provided');
        if (!userId) throw new AuthError(404, 'Not logged in');

        const friendStatus = await this.friendsService.getStatus(username as string, userId);

        return res
            .status(200)
            .json({ status: 'success', message: 'Friend status fetched', friendStatus });
    };

    makeRequest = async (req: Request, res: Response) => {
        const userId = req.userId;
        const { receivedRequestsId } = req.params;

        if (!userId) throw new AuthError(401, 'Not logged in');
        if (!receivedRequestsId)
            throw new ValidationError(400, 'You have to include a user to make a request');

        const request = await this.friendsService.makeRequest(userId, receivedRequestsId as string);

        if (!('length' in request))
            return res.status(200).json({ status: 'success', message: 'Request made', request });

        return res.status(200).json({ status: 'success', message: 'You are now friends', request });
    };

    cancelRequest = async (req: Request, res: Response) => {
        const userId = req.userId;
        const { receivedRequestsId } = req.params;

        if (!userId) throw new AuthError(401, 'Not logged in');
        if (!receivedRequestsId)
            throw new ValidationError(400, 'You have to include a user to cancel a request');

        const request = await this.friendsService.cancelRequest(
            userId,
            receivedRequestsId as string
        );

        return res.status(200).json({ status: 'success', message: 'Request cancelled', request });
    };

    acceptRequest = async (req: Request, res: Response) => {
        const userId = req.userId;
        const { sentRequestsId } = req.params;

        if (!userId) throw new AuthError(401, 'Not logged in');
        if (!sentRequestsId)
            throw new ValidationError(
                400,
                'A user has to make a request to you for you to accept it'
            );

        await this.friendsService.acceptRequest(userId, sentRequestsId as string);
        res.status(200).json({ status: 'success', message: 'You are now friends' });
    };

    denyRequest = async (req: Request, res: Response) => {
        const userId = req.userId;
        const { sentRequestsId } = req.params;

        if (!userId) throw new AuthError(401, 'Not logged in');
        if (!sentRequestsId)
            throw new ValidationError(
                400,
                'A user has to make a request to you for you to deny it'
            );

        await this.friendsService.denyRequest(userId, sentRequestsId as string);
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

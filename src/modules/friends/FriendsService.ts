import ValidationError from '../../shared/errors/ValidationError.js';
import FriendError from './errors/FriendError.js';
import type FriendsRepository from './FriendsRepository.js';

class FriendsService {
    constructor(private friendsRepo: FriendsRepository) {}

    getFriends = async (userId: string) => {
        const friends = await this.friendsRepo.findFriends(userId);
        if (!friends) return null;

        return friends;
    };

    makeRequest = async (sentRequestsId: string, receivedRequestsId: string) => {
        if (sentRequestsId === receivedRequestsId)
            throw new ValidationError(400, 'You cannot make a request to yourself');

        const receivedRequestsUser = await this.friendsRepo.findUser(receivedRequestsId);
        if (!receivedRequestsUser) throw new ValidationError(404, 'Requested user not found');

        const request = await this.friendsRepo.findRequest(sentRequestsId, receivedRequestsId);
        const requested = await this.friendsRepo.findRequest(receivedRequestsId, sentRequestsId);

        if (!request) {
            if (!requested)
                return await this.friendsRepo.makeRequest(sentRequestsId, receivedRequestsId);

            if (requested.stat === 'PENDING')
                return await this.friendsRepo.acceptRequest(sentRequestsId, receivedRequestsId);

            return await this.friendsRepo.makeRequest(sentRequestsId, receivedRequestsId);
        }

        if (request.timesRejected >= 3)
            throw new FriendError(
                403,
                // eslint-disable-next-line quotes
                "Too many requests attempt. You're not allowed to request to this user anymore"
            );
        if (request.stat === 'PENDING') throw new FriendError(401, 'Request is already pending');

        if (request.stat === 'FRIEND')
            // eslint-disable-next-line quotes
            throw new FriendError(401, "You're already friends with this user");

        const timePassed =
            (new Date().getTime() / 1000 / 60 / 60 - request.lastRequestedAt.getTime()) /
            1000 /
            60 /
            60;

        if (timePassed < 1)
            throw new FriendError(403, 'You should wait before making more request to this user');

        return await this.friendsRepo.makeRequest(sentRequestsId, receivedRequestsId);
    };

    acceptRequest = async (userId: string, sentRequestsId: string) => {
        const sentRequestsUser = await this.friendsRepo.findUser(sentRequestsId);
        if (!sentRequestsUser) throw new ValidationError(404, 'User not found');

        const request = await this.friendsRepo.findRequest(sentRequestsId, userId);
        if (!request) throw new FriendError(400, 'User did not make a request to you');

        if (request.stat === 'FRIEND')
            // eslint-disable-next-line quotes
            throw new FriendError(400, "You're already friends with this user");

        if (request.stat === 'DENIED')
            throw new FriendError(
                400,
                'You cannot accept a denied request. Make a request instead'
            );

        if (userId === request.sentRequestsId)
            throw new FriendError(400, 'You cannot accept a request that you made');

        return await this.friendsRepo.acceptRequest(userId, sentRequestsId);
    };

    denyRequest = async (userId: string, sentRequestsId: string) => {
        const sentRequestsUser = await this.friendsRepo.findUser(sentRequestsId);
        if (!sentRequestsUser) throw new ValidationError(404, 'User not found');

        const request = await this.friendsRepo.findRequest(sentRequestsId, userId);
        if (!request) throw new FriendError(400, 'User did not make a request to you');

        if (request.stat === 'FRIEND')
            throw new FriendError(
                400,
                'You cannot deny an accepted request. Try unfriending instead'
            );

        if (request.stat === 'DENIED') throw new FriendError(400, 'This request is already denied');

        return await this.friendsRepo.denyRequest(userId, sentRequestsId);
    };

    unfriend = async (userId: string, friendId: string) => {
        const friendUser = await this.friendsRepo.findUser(friendId);
        if (!friendUser) throw new ValidationError(404, 'User not found');

        const request = await this.friendsRepo.findRequest(userId, friendId);
        // eslint-disable-next-line quotes
        if (!request) throw new FriendError(400, "You're already unfriended with this user");

        if (request.stat === 'DENIED')
            // eslint-disable-next-line quotes
            throw new FriendError(400, "You're already unfriended with this user");

        if (request.stat === 'PENDING')
            throw new FriendError(
                400,
                // eslint-disable-next-line quotes
                "You're already unfriended with this user. Try denying the request instead"
            );

        return await this.friendsRepo.deleteFriendship(userId, friendId);
    };
}

export default FriendsService;

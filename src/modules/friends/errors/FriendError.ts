class FriendError extends Error {
    public name: string = 'FriendError';
    constructor(
        public statusCode: number,
        public message: string
    ) {
        super(message);
    }
}

export default FriendError;

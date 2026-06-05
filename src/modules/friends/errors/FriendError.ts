class FriendError extends Error {
    public name: string = 'FriendError';
    constructor(
        public statusCode: number,
        public message: string,
        public options?: ErrorOptions
    ) {
        super(message, options);
    }
}

export default FriendError;

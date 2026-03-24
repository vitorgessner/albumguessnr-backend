class AuthError extends Error {
    public statusCode: number;
    public name: string = 'AuthError';
    constructor(statusCode: number, message: string) {
        super(message);
        this.statusCode = statusCode;
    }
}

export default AuthError;

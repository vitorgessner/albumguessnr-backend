class AuthError extends Error {
    public statusCode: number;
    public name: string = 'AuthError';
    constructor(statusCode: number, message: string, options?: ErrorOptions) {
        super(message, options);
        this.statusCode = statusCode;
    }
}

export default AuthError;

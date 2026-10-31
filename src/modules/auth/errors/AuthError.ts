class AuthError extends Error {
    public statusCode: number;
    public name: string = 'AuthError';
    public code;
    constructor(statusCode: number, message: string, options?: ErrorOptions, code?: string) {
        super(message, options);
        this.statusCode = statusCode;
        this.code = code;
    }
}

export default AuthError;

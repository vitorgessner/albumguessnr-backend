class AppError extends Error {
    statusCode: number;
    name: string = 'AppError';
    constructor(statusCode: number, message: string, options?: ErrorOptions) {
        super(message, options);
        this.statusCode = statusCode;
    }
}

export default AppError;

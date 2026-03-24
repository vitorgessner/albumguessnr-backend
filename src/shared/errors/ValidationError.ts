class ValidationError extends Error {
    public statusCode: number = 500;
    public name: string = 'ValidationError';
    constructor(statusCode: number, message: string) {
        super(message);
        this.statusCode = statusCode;
    }
}

export default ValidationError;

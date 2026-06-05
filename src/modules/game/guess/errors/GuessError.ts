class GuessError extends Error {
    public statusCode: number;
    public name: string = 'GuessError';
    constructor(statusCode: number, message: string, options?: ErrorOptions) {
        super(message, options);
        this.statusCode = statusCode;
    }
}

export default GuessError;

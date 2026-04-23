class GuessError extends Error {
    public statusCode: number;
    public name: string = 'GuessError';
    constructor(statusCode: number, message: string) {
        super(message);
        this.statusCode = statusCode;
    }
}

export default GuessError;

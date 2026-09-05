export class DailyError extends Error {
    public statusCode: number;
    public name: string = 'DailyError';
    constructor(statusCode: number, message: string, options?: ErrorOptions) {
        super(message, options);
        this.statusCode = statusCode;
    }
}

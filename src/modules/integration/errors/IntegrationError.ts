class IntegrationError extends Error {
    statusCode: number;
    name: string = 'IntegrationError';
    constructor(statusCode: number, message: string) {
        super(message);
        this.statusCode = statusCode;
    }
}

export default IntegrationError;

class IntegrationError extends Error {
    statusCode: number;
    name: string = 'IntegrationError';
    constructor(statusCode: number, message: string, options?: ErrorOptions) {
        super(message, options);
        this.statusCode = statusCode;
    }
}

export default IntegrationError;

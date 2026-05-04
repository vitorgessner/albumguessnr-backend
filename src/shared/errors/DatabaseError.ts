class DatabaseError extends Error {
    public statusCode: number = 500;
    public name: string = 'DatabaseError';
    constructor(statusCode: number, message: string) {
        super(message);
        this.statusCode = statusCode;
    }
}

export default DatabaseError;

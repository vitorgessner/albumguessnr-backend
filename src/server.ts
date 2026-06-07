import config from './config/config.js';
import { getApp } from './app.js';
import { prisma } from './config/prisma.js';
import { initialLogger } from './config/logger/initialLogger.js';
import DatabaseError from './shared/errors/DatabaseError.js';
import { sanitizeError } from './shared/utils/sanitizeCause.js';
import AppError from './shared/errors/AppError.js';

const port = config.port;

const connectWithDatabase = async () => {
    initialLogger.info('STARTING connection with database');
    try {
        await prisma.$connect();
        initialLogger.info('SUCCESS database connected');
    } catch (err) {
        initialLogger.error(
            new DatabaseError(500, 'FAILED to connect with database', {
                cause: sanitizeError(err),
            })
        );
        process.exit(1);
    }
};

const registerRoutes = async () => {
    initialLogger.info('STARTING routes register');
    try {
        const app = getApp();
        initialLogger.info('SUCCESS routes registered');
        return app;
    } catch (err) {
        initialLogger.error(
            new AppError(500, 'FAILED to register routes', { cause: sanitizeError(err) })
        );
        process.exit(1);
    }
};

const startServer = async () => {
    await connectWithDatabase();
    const app = await registerRoutes();

    initialLogger.info('STARTING server');
    const server = app.listen(port, () => {
        initialLogger.info(`SUCCESS server running at http://localhost:${port}`);
    });

    server.on('error', (error) => {
        initialLogger.error(
            new AppError(500, 'FAILED to connect to server', { cause: sanitizeError(error) })
        );
        process.exit(1);
    });
};

startServer();

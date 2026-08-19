// src/config/rabbitmq.ts
import amqp, { Channel, ChannelModel } from 'amqplib';
import { env } from '../app';
import { initialLogger } from './logger/initialLogger';
import { sanitizeError } from '../shared/utils/sanitizeCause';

const MAX_RETRIES = 5;
const INITIAL_DELAY_MS = 1000;

class RabbitMq {
    private connection: ChannelModel | null = null;
    private retries = 0;
    constructor() {}

    private getDelay(): number {
        return INITIAL_DELAY_MS * Math.pow(2, this.retries);
    }

    private async reconnect(): Promise<void> {
        if (this.retries >= MAX_RETRIES) {
            initialLogger.error('RabbitMQ max reconnection attempts reached');
            process.exitCode = 1;
            process.exit();
        }

        const delay = this.getDelay();
        this.retries++;
        initialLogger.warn(
            `RabbitMQ reconnecting in ${delay}ms (attempt ${this.retries}/${MAX_RETRIES})`
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
        await this.getConnection();
    }

    public async getConnection(): Promise<ChannelModel> {
        if (!this.connection) {
            try {
                initialLogger.info('STARTING connection with RabbitMQ');
                this.connection = await amqp.connect(env.RABBITMQ_URL);
                this.retries = 0;
                initialLogger.info('SUCCESS RabbitMQ connected');

                this.connection.on('error', (err) => {
                    initialLogger.error('RabbitMQ connection error', {
                        cause: sanitizeError(err),
                    });
                    this.connection = null;
                    void this.reconnect();
                });

                this.connection.on('close', () => {
                    initialLogger.warn('RabbitMQ connection closed unexpectedly');
                    this.connection = null;
                    void this.reconnect();
                });
            } catch (err) {
                initialLogger.error('FAILED to connect with RabbitMQ', {
                    cause: sanitizeError(err),
                });
                await this.reconnect();
            }
        }

        if (!this.connection) {
            throw new Error('RabbitMQ connection could not be established');
        }

        return this.connection;
    }

    public createChannel = async (): Promise<Channel> => {
        const connection = await this.getConnection();
        return await connection?.createChannel();
    };
}

const rabbitMqInstance = new RabbitMq();

export const getRabbitChannel = () => rabbitMqInstance.createChannel();
export const connectRabbitMQ = () => rabbitMqInstance.getConnection();

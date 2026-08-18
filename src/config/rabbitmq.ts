// src/config/rabbitmq.ts
import amqp, { Channel, ChannelModel } from 'amqplib';

class RabbitMq {
    private connection: ChannelModel | null = null;
    constructor() {}

    private async getConnection(): Promise<ChannelModel> {
        if (!this.connection) {
            this.connection = await amqp.connect('amqp://localhost');

            this.connection.on('error', (err) => {
                console.error('RabbitMQ connection error: ', err);
                this.connection = null;
            });

            this.connection.on('close', () => {
                console.warn('RabbitMQ connection closed.');
                this.connection = null;
            });

            console.log('Successfully connected to RabbitMQ');
        }
        return this.connection;
    }

    public createChannel = async (): Promise<Channel> => {
        const connection = await this.getConnection();
        return await connection.createChannel();
    };
}

const rabbitMqInstance = new RabbitMq();

export const getRabbitChannel = () => rabbitMqInstance.createChannel();

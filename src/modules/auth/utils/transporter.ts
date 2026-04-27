import nodemailer from 'nodemailer';
import { env } from '../../../shared/config/env.js';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    secure: false,
    port: 587,
    auth: {
        user: env.EMAIL,
        pass: env.PASSWORD,
    },
});

export default transporter;

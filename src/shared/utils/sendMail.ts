import { resend } from '../../modules/auth/utils/transporter';

export const sendMail = async (to: string, subject: string, html: string) => {
    await resend.emails.send({
        from: 'noreply@albumguessnr.com',
        to,
        subject,
        html,
    });
};

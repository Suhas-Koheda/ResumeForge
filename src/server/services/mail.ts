import nodemailer from 'nodemailer';
import { config } from '../core/config.js';

class MailService {
    private transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: config.SMTP_HOST,
            port: config.SMTP_PORT,
            secure: config.SMTP_PORT === 465,
            auth: config.SMTP_USER ? {
                user: config.SMTP_USER,
                pass: config.SMTP_PASS,
            } : undefined,
        });
    }

    async sendVerificationEmail(email: string, token: string) {
        const verificationUrl = `${config.APP_URL}/verify?token=${token}`;
        
        const mailOptions = {
            from: config.SMTP_FROM,
            to: email,
            subject: 'Verify your ResumeForge account',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #4f46e5;">Welcome to ResumeForge!</h2>
                    <p>Please click the button below to verify your email address and unlock all features including AI-powered resume building and API key management.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${verificationUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Verify Email</a>
                    </div>
                    <p style="font-size: 12px; color: #666;">If the button doesn't work, copy and paste this link into your browser:</p>
                    <p style="font-size: 12px; color: #666;">${verificationUrl}</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #999;">If you did not create an account on ResumeForge, please ignore this email.</p>
                </div>
            `,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            if (config.IS_LOCAL) {
                console.log(`[MAIL] Verification email sent to ${email}. Token: ${token}`);
            }
        } catch (error) {
            console.error('[MAIL] Error sending verification email:', error);
            throw new Error('Failed to send verification email');
        }
    }
}

export const mailService = new MailService();

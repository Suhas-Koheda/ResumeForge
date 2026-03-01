import { Resend } from 'resend';
import { config } from '../core/config.js';

class EmailService {
    private resend: Resend | null = null;

    constructor() {
        if (config.EMAIL.SMTP_PASS) {
            this.resend = new Resend(config.EMAIL.SMTP_PASS);
        }
    }

    async sendVerificationEmail(email: string, token: string) {
        if (!this.resend) {
            console.warn("[EMAIL_SERVICE] Resend API Key is missing. Email not sent.");
            if (config.IS_LOCAL) {
                console.log(`[DEV_ONLY] Verification Link: ${config.APP_URL}/verify?token=${token}`);
            }
            return;
        }

        const verificationUrl = `${config.APP_URL}/verify?token=${token}`;

        try {
            const { data, error } = await this.resend.emails.send({
                from: config.EMAIL.SMTP_FROM,
                to: email,
                subject: 'Verify your ResumeForge account',
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
                        <h2 style="color: #333;">Welcome to ResumeForge!</h2>
                        <p>Thank you for signing up. Please verify your email address to get started.</p>
                        <div style="margin: 30px 0;">
                            <a href="${verificationUrl}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email Address</a>
                        </div>
                        <p style="color: #666; font-size: 14px;">If you didn't create an account, you can safely ignore this email.</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                        <p style="color: #999; font-size: 12px;">ResumeForge &copy; 2026</p>
                    </div>
                `
            });

            if (error) {
                console.error("[EMAIL_SERVICE] Resend error:", error);
                throw new Error("Failed to send email");
            }

            return data;
        } catch (err) {
            console.error("[EMAIL_SERVICE] Failed to send verification email:", err);
            throw err;
        }
    }
}

export const emailService = new EmailService();

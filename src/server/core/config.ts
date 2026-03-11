import dotenv from 'dotenv';

try {
    dotenv.config();
} catch (e) {
    // Ignore dotenv errors in production (should not happen in local mode)
}

export const config = {
    PORT: Number(process.env.PORT) || 5000,
    IS_LOCAL: process.env.IS_LOCAL !== 'false', // Default to true unless explicitly 'false'
    
    // Database
    DB_URL: process.env.DB_URL || '',
    DB_USERNAME: process.env.DB_USERNAME || '',
    DB_PASSWORD: process.env.DB_PASSWORD || '',
    
    // Gemini AI
    GEMINI_MODEL_NAME: process.env.GEMINI_MODEL_NAME || 'gemini-2.5-flash',
    GEMINI_API_KEYS: ((): string[] => {
        const val = process.env.GEMINI_API_KEYS;
        if (!val) return [];
        try {
            if (val.trim().startsWith('[')) return JSON.parse(val);
        } catch {
            // fallthrough to split
        }
        return val.split(',').map(k => k.trim()).filter(Boolean);
    })(),

    // Encryption / JWT
    JWT_SECRET: process.env.JWT_SECRET || 'local-dev-secret',

    // Email
    EMAIL: {
        SMTP_HOST: process.env.SMTP_HOST || 'smtp.resend.com',
        SMTP_PORT: Number(process.env.SMTP_PORT) || 465,
        SMTP_USER: process.env.SMTP_USER || 'resend',
        SMTP_PASS: process.env.SMTP_PASS || '', 
        SMTP_FROM: process.env.SMTP_FROM || 'onboarding@resend.dev',
    },

    // App URL
    APP_URL: process.env.APP_URL || 'http://localhost:5173',
};

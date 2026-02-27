import dotenv from 'dotenv';
dotenv.config();

export const config = {
    PORT: process.env.PORT || 5000,
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/resumeforge',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
    JWT_SECRET: process.env.JWT_SECRET || 'super-secret-key',
    IS_LOCAL: process.env.IS_LOCAL === 'true' || true,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:5173']
};

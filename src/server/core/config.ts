import dotenv from 'dotenv';

try {
    dotenv.config();
} catch (e) {
    // Ignore dotenv errors in production serverless
}

export const config = {
    PORT: process.env.PORT || 5000,
    // Database URL - Support both MONGODB_URI and DB_URL for backward compatibility
    MONGODB_URI: process.env.DB_URL || process.env.MONGODB_URI || 'postgres://localhost:5432/resumeforge',
    DB_USERNAME: process.env.DB_USERNAME,
    DB_PASSWORD: process.env.DB_PASSWORD,
    // Using stable Gemini 1.5 models
    GEMINI_MODEL_NAME: process.env.GEMINI_MODEL_NAME || 'gemini-2.5-flash',
    GEMINI_API_KEYS: process.env.GEMINI_API_KEYS ? process.env.GEMINI_API_KEYS.split(',') : [],
    JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-keep-secure',
    IS_LOCAL: process.env.IS_LOCAL !== undefined
        ? process.env.IS_LOCAL === 'true'
        : (!process.env.VERCEL && !process.env.NETLIFY && !process.env.RENDER && process.env.NODE_ENV !== 'production'),
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',')
        : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174']
};

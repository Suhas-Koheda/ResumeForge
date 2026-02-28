import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the backend root
dotenv.config({ path: path.join(__dirname, '../../../.env') });

export const config = {
    PORT: process.env.PORT || 5000,
    // Database URL - Support both MONGODB_URI and DB_URL for backward compatibility
    MONGODB_URI: process.env.DB_URL || process.env.MONGODB_URI || 'postgres://localhost:5432/resumeforge',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
    JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-keep-secure',
    // IS_LOCAL is true if not explicitly set to 'false' or if NODE_ENV is development
    IS_LOCAL: process.env.IS_LOCAL === 'false' ? false : true,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',')
        : ['http://localhost:5173', 'http://localhost:3000']
};

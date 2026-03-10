import dotenv from 'dotenv';

try {
    dotenv.config();
} catch (e) {
    // Ignore dotenv errors in production (should not happen in local mode)
}

export const config = {
    PORT: Number(process.env.PORT) || 5000,
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
    // Encryption / JWT (kept as thin secret for local data integrity)
    JWT_SECRET: process.env.JWT_SECRET || 'local-dev-secret',
};

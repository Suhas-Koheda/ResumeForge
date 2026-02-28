import crypto from 'crypto';
import { config } from './config.js';

// 256-bit key from JWT_SECRET or a fallback
// For production, we should use a dedicated ENCRYPTION_KEY
const ENCRYPTION_KEY = Buffer.from(
    crypto.createHash('sha256').update(config.JWT_SECRET || 'fallback-encryption-key').digest('hex'),
    'hex'
);
const IV_LENGTH = 16;

export const encryptionService = {
    encrypt(text: string): string {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    },

    decrypt(text: string): string {
        try {
            const textParts = text.split(':');
            const iv = Buffer.from(textParts.shift()!, 'hex');
            const encryptedText = Buffer.from(textParts.join(':'), 'hex');
            const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
            let decrypted = decipher.update(encryptedText);
            decrypted = Buffer.concat([decrypted, decipher.final()]);
            return decrypted.toString();
        } catch (e) {
            console.error("[LOG_ENCRYPTION] Decryption failed, returning original text (might be unencrypted legacy data)");
            return text;
        }
    }
};

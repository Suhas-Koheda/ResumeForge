import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import { AppDataSource } from './database.js';
import { User } from '../entities/User.entity.js';
import { config } from './config.js';

export const verificationMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
    // 1. Local Bypass (Always verified in local dev mode)
    if (config.IS_LOCAL) {
        return next();
    }

    if (!req.userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const userRepo = AppDataSource.getRepository(User);
        const user = await userRepo.findOne({ where: { id: req.userId } });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!user.isVerified) {
            return res.status(403).json({ 
                error: 'Email verification required', 
                message: 'Please verify your email to access this feature.' 
            });
        }

        next();
    } catch (error) {
        console.error("[VERIFICATION_MIDDLEWARE] Error:", error);
        res.status(500).json({ error: 'Internal server error during verification check' });
    }
};

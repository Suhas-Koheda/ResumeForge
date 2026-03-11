import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from './config.js';

export interface AuthRequest extends Request {
    userId?: string;
}

/**
 * Dual-mode auth middleware.
 * - Local: Always succeeds with a fixed local user ID.
 * - Cloud: Verifies JWT from Authorization header.
 */
export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (config.IS_LOCAL) {
        req.userId = 'local-dev-user';
        return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized: No token provided' });
        return;
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, config.JWT_SECRET) as { userId: string };
        req.userId = decoded.userId;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }
};

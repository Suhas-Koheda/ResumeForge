import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
    userId?: string;
}

/**
 * Local-only auth middleware.
 * Always succeeds with a fixed local user ID – no JWT verification needed.
 */
export const authMiddleware = (req: AuthRequest, _res: Response, next: NextFunction): void => {
    req.userId = 'local-dev-user';
    next();
};

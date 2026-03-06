import path from 'path';
import { AuthRequest } from '../core/auth.js';
import { FileService } from './fileService.js';

/**
 * Helper to get FileService for the current user.
 * Sandboxes the workspace to a specific folder.
 */
export const getFileServiceClient = (req: AuthRequest) => {
  const workspaceRoot = path.resolve(process.cwd(), 'templates');
  // For now, shared workspace. To enable per-user isolation:
  // const workspaceRoot = path.resolve(process.cwd(), 'templates', req.userId!.toString());
  return new FileService(workspaceRoot);
};

import express from 'express';
import { authMiddleware, AuthRequest } from '../../core/auth.js';
import { verificationMiddleware } from '../../core/verification.js';
import { getFileServiceClient } from '../../services/fileServiceClient.js';

const router = express.Router();

const getFileService = getFileServiceClient;

// List all files
router.get('/', authMiddleware, verificationMiddleware, async (req: AuthRequest, res) => {
  try {
    const fs = getFileService(req);
    const files = await fs.listFiles();
    res.json(files);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Read file content
router.get('/:path(*)', authMiddleware, verificationMiddleware, async (req: AuthRequest, res) => {
  try {
    const fs = getFileService(req);
    const content = await fs.readFile(req.params.path);
    res.json({ content });
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

// Create/Update file
router.post('/', authMiddleware, verificationMiddleware, async (req: AuthRequest, res) => {
  try {
    const { path, content } = req.body;
    if (!path || content === undefined) {
      return res.status(400).json({ error: 'Path and content are required' });
    }
    const fs = getFileService(req);
    await fs.writeFile(path, content);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete file
router.delete('/:path(*)', authMiddleware, verificationMiddleware, async (req: AuthRequest, res) => {
  try {
    const fs = getFileService(req);
    await fs.deleteFile(req.params.path);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Rename file
router.post('/rename', authMiddleware, verificationMiddleware, async (req: AuthRequest, res) => {
  try {
    const { oldPath, newPath } = req.body;
    if (!oldPath || !newPath) {
      return res.status(400).json({ error: 'oldPath and newPath are required' });
    }
    const fs = getFileService(req);
    await fs.renameFile(oldPath, newPath);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

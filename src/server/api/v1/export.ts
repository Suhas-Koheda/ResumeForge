import express from 'express';
import { authMiddleware, AuthRequest } from '../../core/auth.js';
import { latexService } from '../../services/latex.js';
import fs from 'fs/promises';

const router = express.Router();

router.post('/pdf', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { latexCode } = req.body;
        if (!latexCode) {
            return res.status(400).json({ error: 'LaTeX code is required' });
        }

        const pdfPath = await latexService.compileToPdf(latexCode);

        res.download(pdfPath, 'resume.pdf', async (err) => {
            // Clean up the temporary directory after sending
            try {
                const dir = pdfPath.substring(0, pdfPath.lastIndexOf(process.platform === 'win32' ? '\\' : '/'));
                await fs.rm(dir, { recursive: true, force: true });
            } catch (cleanupErr) {
                console.error('Cleanup error:', cleanupErr);
            }
        });
    } catch (error: any) {
        console.error('PDF Export Route Error:', error);
        res.status(500).json({ 
            error: 'PDF Compilation failed', 
            details: error.message 
        });
    }
});

export default router;

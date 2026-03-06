import express from 'express';
import { authMiddleware, AuthRequest } from '../../core/auth.js';
import { latexCompiler } from '../../services/latexCompiler.js';
import { getFileServiceClient } from '../../services/fileServiceClient.js';

const router = express.Router();

/**
 * POST /api/v1/export/pdf
 * Body: { latexCode: string }
 *
 * Compiles the provided LaTeX source with the local Tectonic engine.
 */
router.post('/pdf', authMiddleware, async (req: AuthRequest, res) => {
    const { files } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ error: 'LaTeX files are required' });
    }

    try {
        const fileService = getFileServiceClient(req);
        const workspacePath = fileService.workspaceRoot;
        const result = await latexCompiler.compile(files, { workspacePath });
        if (!result.success || !result.pdf) {
            console.error('[EXPORT] Tectonic compilation failed:', result.logs);
            return res.status(500).json({
                error: 'PDF compilation failed.',
                details: result.logs,
            });
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=resume.pdf');
        res.setHeader('Content-Length', result.pdf.length.toString());
        return res.status(200).send(result.pdf);

    } catch (error: any) {
        console.error('[EXPORT] Tectonic compilation failed:', error.message);
        return res.status(500).json({
            error: 'PDF compilation failed.',
            details: error.message,
        });
    }
});

export default router;

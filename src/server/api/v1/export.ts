import express from 'express';
import { authMiddleware, AuthRequest } from '../../core/auth.js';
import { latexService } from '../../services/latex.js';

const router = express.Router();

/**
 * POST /api/v1/export/pdf
 * Body: { latexCode: string }
 *
 * Compiles the provided LaTeX source with the local Tectonic engine
 * and returns the PDF as an application/pdf binary buffer.
 * No external services are used.
 */
router.post('/pdf', authMiddleware, async (req: AuthRequest, res) => {
    const { latexCode } = req.body;

    if (!latexCode) {
        return res.status(400).json({ error: 'LaTeX code is required' });
    }

    try {
        const pdfBuffer = await latexService.compileToPdf(latexCode);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=resume.pdf');
        res.setHeader('Content-Length', pdfBuffer.length.toString());
        return res.status(200).send(pdfBuffer);

    } catch (error: any) {
        console.error('[EXPORT] Tectonic compilation failed:', error.message);
        return res.status(500).json({
            error: 'PDF compilation failed.',
            details: error.message,
        });
    }
});

export default router;

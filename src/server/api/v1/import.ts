import express from 'express';
import { latexParserService } from '../../services/parser/index.js';

const router = express.Router();

/**
 * POST /api/v1/import/latex
 * Body: { latexCode: string }
 *
 * Parses raw LaTeX into blocks using our AST engine.
 */
router.post('/latex', async (req, res) => {
    const { latexCode } = req.body;

    if (!latexCode) {
        return res.status(400).json({ error: 'LaTeX code is required' });
    }

    try {
        const result = await latexParserService.parse(latexCode);
        return res.status(200).json(result);
    } catch (error: any) {
        console.error('[IMPORT] LaTeX Parsing Failed:', error.message);
        return res.status(500).json({
            error: 'Failed to structuralize LaTeX template. ' + error.message,
            blocks: [] // Return empty so the frontend won't crash
        });
    }
});

export default router;

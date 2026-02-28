import express from 'express';
import { authMiddleware, AuthRequest } from '../../core/auth.js';
import axios from 'axios';

const router = express.Router();

router.post('/pdf', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { latexCode } = req.body;
        if (!latexCode) {
            return res.status(400).json({ error: 'LaTeX code is required' });
        }

        // Sending the LaTeX payload to an external LaTeX compilation API (latexonline.cc)
        // Ensure you provide the raw code.
        const pdfResponse = await axios.post('https://latexonline.cc/compile?command=pdflatex', latexCode, {
            headers: { 'Content-Type': 'text/plain' },
            responseType: 'arraybuffer' 
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=resume.pdf');
        
        // Pipe the buffer back to the user seamlessly
        res.status(200).send(pdfResponse.data);

    } catch (error: any) {
        console.error('PDF Export Route Error:', error.response?.data ? error.response.data.toString() : error.message);
        res.status(500).json({ 
            error: 'Serverless PDF Compilation failed via External Service. The service may be down, or the LaTeX code has compilation errors.',
            details: error.message
        });
    }
});

export default router;

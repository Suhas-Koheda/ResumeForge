import express from 'express';
import { Resume } from '../../models/Resume.js';
import { authMiddleware, AuthRequest } from '../../core/auth.js';

const router = express.Router();

// Get all resumes for authenticated user
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const resumes = await Resume.find({ userId: req.userId });
        res.json(resumes);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch resumes' });
    }
});

// Save or Update a resume
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { title, canvasData, id } = req.body;

        if (id) {
            // Update existing
            const updated = await Resume.findOneAndUpdate(
                { _id: id, userId: req.userId },
                { title, canvasData },
                { new: true }
            );
            return res.json(updated);
        }

        // Create new
        const resume = new Resume({
            userId: req.userId,
            title,
            canvasData
        });
        await resume.save();
        res.status(201).json(resume);
    } catch (error) {
        res.status(500).json({ error: 'Failed to save resume' });
    }
});

// Delete a resume
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
        await Resume.findOneAndDelete({ _id: req.params.id, userId: req.userId });
        res.json({ message: 'Resume deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Delete failed' });
    }
});

export default router;

import express from 'express';
import { AppDataSource } from '../../index.js';
import { Resume } from '../../entities/Resume.entity.js';
import { authMiddleware, AuthRequest } from '../../core/auth.js';

const router = express.Router();

// Get all resumes for authenticated user
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const resumeRepo = AppDataSource.getRepository(Resume);
        const resumes = await resumeRepo.find({ where: { userId: req.userId } });
        res.json(resumes);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch resumes' });
    }
});

// Save or Update a resume
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { title, canvasData, id } = req.body;
        const resumeRepo = AppDataSource.getRepository(Resume);

        if (id) {
            let resume = await resumeRepo.findOne({ where: { id, userId: req.userId } });
            if (resume) {
                resume.title = title;
                resume.canvasData = canvasData;
                await resumeRepo.save(resume);
                return res.json(resume);
            }
        }

        const resume = resumeRepo.create({
            userId: req.userId,
            title,
            canvasData
        });
        await resumeRepo.save(resume);
        res.status(201).json(resume);
    } catch (error) {
        res.status(500).json({ error: 'Failed to save resume' });
    }
});

// Delete a resume
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const resumeRepo = AppDataSource.getRepository(Resume);
        await resumeRepo.delete({ id: req.params.id, userId: req.userId });
        res.json({ message: 'Resume deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Delete failed' });
    }
});

export default router;

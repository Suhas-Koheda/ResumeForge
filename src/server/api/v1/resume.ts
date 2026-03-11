import express from 'express';
import { AppDataSource } from '../../core/database.js';
import { Resume } from '../../entities/Resume.entity.js';
import { authMiddleware, AuthRequest } from '../../core/auth.js';
import { UsageService } from '../../services/usageService.js';

const router = express.Router();

// Get all resumes for authenticated user
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
    try {
        if (!req.userId) {
            return res.status(401).json({ error: 'User context missing' });
        }

        console.log(`[LOG_DB] Fetching resumes for user: ${req.userId}`);
        const resumeRepo = AppDataSource.getRepository(Resume);
        const resumes = await resumeRepo.find({
            where: { userId: req.userId },
            order: { updatedAt: 'DESC' }
        });

        console.log(`[LOG_DB] Found ${resumes.length} resumes`);
        res.json(resumes);
    } catch (error: any) {
        console.error('[LOG_DB] ERROR fetching resumes:', error.message);
        res.status(500).json({ error: 'Failed to fetch resumes', details: error.message });
    }
});

// Save or Update a resume
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
    try {
        if (!req.userId) {
            return res.status(401).json({ error: 'User context missing' });
        }

        const { title, canvasData, id } = req.body;
        const resumeRepo = AppDataSource.getRepository(Resume);
        const normalizedTitle = title?.trim() || "Untitled Resume";

        // 1. If ID is present, try updating that specific resume
        if (id) {
            let resume = await resumeRepo.findOne({ where: { id, userId: req.userId } });
            if (resume) {
                resume.title = normalizedTitle;
                resume.canvasData = canvasData;
                await resumeRepo.save(resume);
                return res.json(resume);
            }
        }

        // 2. To avoid duplicates of the same title (e.g., "Resume R_1"), check by user+title
        let existingResume = await resumeRepo.findOne({
            where: { title: normalizedTitle, userId: req.userId },
            order: { updatedAt: 'DESC' }
        });

        if (existingResume) {
            console.log(`[LOG_DB] Updating existing resume by title: ${normalizedTitle}`);
            existingResume.canvasData = canvasData;
            await resumeRepo.save(existingResume);
            return res.json(existingResume);
        }

        // 3. Create new resume
        console.log(`[LOG_DB] Creating new resume: ${normalizedTitle}`);

        // Enforcement of limits in Cloud
        const limitCheck = await UsageService.checkResumeLimit(req.userId);
        if (!limitCheck.allowed) {
            return res.status(403).json({ error: 'Limit reached', message: limitCheck.message });
        }

        const resume = resumeRepo.create({
            userId: req.userId,
            title: normalizedTitle,
            canvasData: canvasData || { nodes: [] }
        });
        await resumeRepo.save(resume);
        res.status(201).json(resume);
    } catch (error: any) {
        if (error.code === '23505') {
            console.warn('[LOG_DB] Race condition: Duplicate title blocked by DB constraint');
            return res.status(409).json({ error: 'Conflict: Resume with this title already exists.' });
        }
        console.error('[LOG_DB] ERROR saving resume:', error.message);
        res.status(500).json({ error: 'Failed to save resume', details: error.message });
    }
});

// Delete a resume
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
        if (!req.userId) {
            return res.status(401).json({ error: 'User context missing' });
        }

        const resumeRepo = AppDataSource.getRepository(Resume);
        const result = await resumeRepo.delete({ id: req.params.id, userId: req.userId });

        if (result.affected === 0) {
            return res.status(404).json({ error: 'Resume not found or unauthorized' });
        }

        res.json({ message: 'Resume deleted' });
    } catch (error: any) {
        console.error('[LOG_DB] ERROR deleting resume:', error.message);
        res.status(500).json({ error: 'Delete failed', details: error.message });
    }
});

export default router;

import express from 'express';
import { AppDataSource } from '../../core/database.js';
import { Template } from '../../entities/Template.entity.js';

const router = express.Router();

router.get('/', async (req: any, res) => {
    try {
        const repo = AppDataSource.getRepository(Template);
        const templates = await repo.find({ where: { user: { id: req.userId } } });
        res.json(templates);
    } catch (error) {
        console.error("[TEMPLATE] Get error:", error);
        res.status(500).json({ error: 'Failed to get templates' });
    }
});

router.post('/', async (req: any, res) => {
    try {
        const { title, content } = req.body;
        const repo = AppDataSource.getRepository(Template);
        
        const template = repo.create({
            name: title,
            preamble: content,
            user: { id: req.userId },
            config: {}, // Required field in entity
            styles: {}  // Required field in entity
        });

        await repo.save(template);
        res.status(201).json(template);
    } catch (error) {
        console.error("[TEMPLATE] Create error:", error);
        res.status(500).json({ error: 'Failed to save template' });
    }
});

router.put('/:id', async (req: any, res) => {
    try {
        const { title, content } = req.body;
        const repo = AppDataSource.getRepository(Template);
        
        const template = await repo.findOne({ where: { id: req.params.id, user: { id: req.userId } } });
        if (!template) return res.status(404).json({ error: 'Template not found' });

        if (title) template.name = title;
        if (content) template.preamble = content;
        
        await repo.save(template);
        res.json(template);
    } catch (error) {
        console.error("[TEMPLATE] Update error:", error);
        res.status(500).json({ error: 'Failed to update template' });
    }
});

router.delete('/:id', async (req: any, res) => {
    try {
        const repo = AppDataSource.getRepository(Template);
        const result = await repo.delete({ id: req.params.id, user: { id: req.userId } });
        
        if (result.affected === 0) return res.status(404).json({ error: 'Template not found' });
        
        res.json({ message: 'Template deleted' });
    } catch (error) {
        console.error("[TEMPLATE] Delete error:", error);
        res.status(500).json({ error: 'Failed to delete template' });
    }
});

export default router;

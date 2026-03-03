import express from 'express';
import { AppDataSource } from '../../core/database.js';
import { Template } from '../../entities/Template.entity.js';
import { TemplateVersion } from '../../entities/TemplateVersion.entity.js';
import { latexCompiler } from '../../services/latexCompiler.js';

const router = express.Router();

/** List templates (public + user's) */
router.get('/', async (req: any, res) => {
    try {
        const repo = AppDataSource.getRepository(Template);
        const templates = await repo.find({ 
            where: [
                { userId: req.userId },
                { isPublic: true }
            ],
            order: { updatedAt: 'DESC' }
        });
        res.json(templates);
    } catch (error) {
        console.error("[TEMPLATE] Get error:", error);
        res.status(500).json({ error: 'Failed to get templates' });
    }
});

/** Get built-in templates (Special static ones) */
router.get('/built-in', async (req, res) => {
    // In a real app, these might be in a separate table or just hardcoded
    // For now, let's just return a placeholder or specific ones from DB with a tag
    res.json([]); 
});

/** Get template details */
router.get('/:id', async (req: any, res) => {
    try {
        const repo = AppDataSource.getRepository(Template);
        const template = await repo.findOne({ 
            where: { id: req.params.id },
            relations: ['versions']
        });
        
        if (!template) return res.status(404).json({ error: 'Template not found' });
        if (!template.isPublic && template.userId !== req.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        res.json(template);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get template' });
    }
});

/** Create new template */
router.post('/', async (req: any, res) => {
    try {
        const { name, description, config, preamble, styles, isPublic } = req.body;
        const repo = AppDataSource.getRepository(Template);
        
        const template = repo.create({
            name,
            description,
            config,
            preamble,
            styles,
            isPublic: isPublic || false,
            userId: req.userId,
            version: 1
        });

        await repo.save(template);

        // Save initial version
        const versionRepo = AppDataSource.getRepository(TemplateVersion);
        const tVersion = versionRepo.create({
            template,
            version: 1,
            config,
            preamble
        });
        await versionRepo.save(tVersion);

        res.status(201).json(template);
    } catch (error) {
        console.error("[TEMPLATE] Create error:", error);
        res.status(500).json({ error: 'Failed to save template' });
    }
});

/** Update template */
router.put('/:id', async (req: any, res) => {
    try {
        const { name, description, config, preamble, styles, isPublic } = req.body;
        const repo = AppDataSource.getRepository(Template);
        
        const template = await repo.findOne({ where: { id: req.params.id, userId: req.userId } });
        if (!template) return res.status(404).json({ error: 'Template not found' });

        if (name) template.name = name;
        if (description !== undefined) template.description = description;
        if (config) template.config = config;
        if (preamble) template.preamble = preamble;
        if (styles) template.styles = styles;
        if (isPublic !== undefined) template.isPublic = isPublic;
        
        template.version += 1;
        await repo.save(template);

        // Save new version
        const versionRepo = AppDataSource.getRepository(TemplateVersion);
        const tVersion = versionRepo.create({
            template,
            version: template.version,
            config: config || template.config,
            preamble: preamble || template.preamble
        });
        await versionRepo.save(tVersion);

        res.json(template);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update template' });
    }
});

/** Delete template */
router.delete('/:id', async (req: any, res) => {
    try {
        const repo = AppDataSource.getRepository(Template);
        const result = await repo.delete({ id: req.params.id, userId: req.userId });
        if (result.affected === 0) return res.status(404).json({ error: 'Template not found' });
        res.json({ message: 'Template deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete template' });
    }
});

/** Duplicate template */
router.post('/:id/duplicate', async (req: any, res) => {
    try {
        const repo = AppDataSource.getRepository(Template);
        const template = await repo.findOne({ where: { id: req.params.id } });
        if (!template) return res.status(404).json({ error: 'Template not found' });

        const newTemplate = repo.create({
            ...template,
            id: undefined,
            name: `${template.name} (Copy)`,
            userId: req.userId,
            isPublic: false,
            version: 1,
            createdAt: undefined,
            updatedAt: undefined
        });

        await repo.save(newTemplate);
        res.status(201).json(newTemplate);
    } catch (error) {
        res.status(500).json({ error: 'Failed to duplicate template' });
    }
});

/** Preview PDF */
router.post('/preview', async (req: any, res) => {
    try {
        const { latex } = req.body;
        const result = await latexCompiler.compile(latex);
        if (result.success && result.pdf) {
            res.setHeader('Content-Type', 'application/pdf');
            res.send(result.pdf);
        } else {
            res.status(400).json({ 
                error: 'Compilation failed', 
                errors: result.errors,
                logs: result.logs 
            });
        }
    } catch (error) {
        res.status(500).json({ error: 'Preview generation failed' });
    }
});

/** Export template as JSON */
router.post('/:id/export', async (req: any, res) => {
    try {
        const repo = AppDataSource.getRepository(Template);
        const template = await repo.findOne({ where: { id: req.params.id } });
        if (!template) return res.status(404).json({ error: 'Template not found' });
        
        const exportData = {
            name: template.name,
            config: template.config,
            preamble: template.preamble,
            styles: template.styles
        };
        
        res.json(exportData);
    } catch (error) {
        res.status(500).json({ error: 'Export failed' });
    }
});

/** Import template from JSON */
router.post('/import', async (req: any, res) => {
    try {
        const { name, config, preamble, styles } = req.body;
        const repo = AppDataSource.getRepository(Template);
        
        const template = repo.create({
            name: name || 'Imported Template',
            config,
            preamble,
            styles,
            userId: req.userId,
            version: 1
        });

        await repo.save(template);
        res.status(201).json(template);
    } catch (error) {
        res.status(500).json({ error: 'Import failed' });
    }
});

export default router;

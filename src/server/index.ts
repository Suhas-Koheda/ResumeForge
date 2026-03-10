import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { config } from './core/config.js';
import { connectToDatabase, AppDataSource } from './core/database.js';
import { authMiddleware, AuthRequest } from './core/auth.js';
import { aiService } from './services/ai.js';
import { Resume } from './entities/Resume.entity.js';
import { latexCompiler } from './services/latexCompiler.js';
import { getFileServiceClient } from './services/fileServiceClient.js';
import { latexParserService } from './services/parser/index.js';
import { Template } from './entities/Template.entity.js';

import path from 'path';
import fs from 'fs';

const app = express();

console.log('=== ResumeForge Local Server ===');

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: 'Too many requests, please try again later.',
});
app.use('/api', limiter);

// Simple request logger
app.use((req, _res, next) => {
    console.log(`[REQ] ${req.method} ${req.url}`);
    next();
});

// ── DB Middleware — ensure connection before any API call ─────────────────────
const ensureDb = async (_req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
        await connectToDatabase();
        next();
    } catch (e) {
        res.status(500).json({ error: 'Database connection failed' });
    }
};

// ── Routes ───────────────────────────────────────────────────────────────────
const apiRouter = express.Router();
apiRouter.use(ensureDb);

// Health check
apiRouter.get('/health', (_req, res) => {
    res.json({ status: 'ok', mode: 'LOCAL', db: 'sqlite' });
});

// ── Resume CRUD ───────────────────────────────────────────────────────────────
apiRouter.get('/resumes', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const repo = AppDataSource.getRepository(Resume);
        const resumes = await repo.find({ where: { userId: req.userId! }, order: { updatedAt: 'DESC' } });
        res.json(resumes);
    } catch (e: any) {
        res.status(500).json({ error: 'Failed to fetch resumes', details: e.message });
    }
});

apiRouter.post('/resumes', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { title, canvasData, id } = req.body;
        const repo = AppDataSource.getRepository(Resume);
        const normalizedTitle = (title || 'Untitled Resume').trim();

        // Try updating by ID
        if (id) {
            const existing = await repo.findOne({ where: { id, userId: req.userId! } });
            if (existing) {
                existing.title = normalizedTitle;
                existing.canvasData = canvasData;
                await repo.save(existing);
                return res.json(existing);
            }
        }

        // Try updating by title
        const byTitle = await repo.findOne({ where: { title: normalizedTitle, userId: req.userId! } });
        if (byTitle) {
            byTitle.canvasData = canvasData;
            await repo.save(byTitle);
            return res.json(byTitle);
        }

        // Create new
        const resume = repo.create({ userId: req.userId!, title: normalizedTitle, canvasData });
        await repo.save(resume);
        return res.status(201).json(resume);
    } catch (e: any) {
        res.status(500).json({ error: 'Failed to save resume', details: e.message });
    }
});

apiRouter.delete('/resumes/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const repo = AppDataSource.getRepository(Resume);
        const result = await repo.delete({ id: req.params.id, userId: req.userId! });
        if (result.affected === 0) return res.status(404).json({ error: 'Resume not found' });
        res.json({ message: 'Resume deleted' });
    } catch (e: any) {
        res.status(500).json({ error: 'Delete failed', details: e.message });
    }
});

// ── Template CRUD (simple: title + content string) ────────────────────────────
apiRouter.get('/templates', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const repo = AppDataSource.getRepository(Template);
        const templates = await repo.find({ where: { userId: req.userId! }, order: { updatedAt: 'DESC' } });
        res.json(templates);
    } catch (e: any) {
        res.status(500).json({ error: 'Failed to fetch templates', details: e.message });
    }
});

apiRouter.post('/templates', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { title, content } = req.body;
        const repo = AppDataSource.getRepository(Template);
        const template = repo.create({ name: title, preamble: content, userId: req.userId!, version: 1 });
        await repo.save(template);
        res.status(201).json(template);
    } catch (e: any) {
        res.status(500).json({ error: 'Failed to save template', details: e.message });
    }
});

apiRouter.delete('/templates/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const repo = AppDataSource.getRepository(Template);
        const result = await repo.delete({ id: req.params.id, userId: req.userId! });
        if (result.affected === 0) return res.status(404).json({ error: 'Template not found' });
        res.json({ message: 'Template deleted' });
    } catch (e: any) {
        res.status(500).json({ error: 'Delete failed', details: e.message });
    }
});

// ── File Service ──────────────────────────────────────────────────────────────
apiRouter.get('/files', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const files = await getFileServiceClient(req).listFiles();
        res.json(files);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

apiRouter.get('/files/:path(*)', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const content = await getFileServiceClient(req).readFile(req.params.path);
        res.json({ content });
    } catch (e: any) {
        res.status(404).json({ error: e.message });
    }
});

apiRouter.post('/files', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { path: filePath, content } = req.body;
        if (!filePath || content === undefined) return res.status(400).json({ error: 'path and content are required' });
        await getFileServiceClient(req).writeFile(filePath, content);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

apiRouter.delete('/files/:path(*)', authMiddleware, async (req: AuthRequest, res) => {
    try {
        await getFileServiceClient(req).deleteFile(req.params.path);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

apiRouter.post('/files/rename', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { oldPath, newPath } = req.body;
        if (!oldPath || !newPath) return res.status(400).json({ error: 'oldPath and newPath are required' });
        await getFileServiceClient(req).renameFile(oldPath, newPath);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// ── PDF Export ────────────────────────────────────────────────────────────────
apiRouter.post('/export/pdf', authMiddleware, async (req: AuthRequest, res) => {
    const { files } = req.body;
    if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ error: 'Files array is required' });
    }
    try {
        const fileService = getFileServiceClient(req);
        const result = await latexCompiler.compile(files, { workspacePath: fileService.workspaceRoot });
        if (!result.success || !result.pdf) {
            return res.status(500).json({ error: 'PDF compilation failed.', details: result.logs });
        }
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=resume.pdf');
        return res.status(200).send(result.pdf);
    } catch (e: any) {
        return res.status(500).json({ error: 'PDF compilation failed.', details: e.message });
    }
});

// ── LaTeX Import ──────────────────────────────────────────────────────────────
apiRouter.post('/import/latex', async (req, res) => {
    const { latexCode } = req.body;
    if (!latexCode) return res.status(400).json({ error: 'LaTeX code is required' });
    try {
        const result = await latexParserService.parse(latexCode);
        res.json(result);
    } catch (e: any) {
        res.status(500).json({ error: 'Failed to parse LaTeX. ' + e.message, blocks: [] });
    }
});

// ── AI Routes ─────────────────────────────────────────────────────────────────
apiRouter.post('/ai/experience', authMiddleware, async (req, res) => {
    try {
        const result = await aiService.polishExperience(req.body.text);
        res.json(JSON.parse(result));
    } catch (e: any) {
        res.status(500).json({ error: 'AI processing failed', details: e.message });
    }
});

apiRouter.post('/ai/skills', authMiddleware, async (req, res) => {
    try {
        const result = await aiService.polishSkills(req.body.text);
        res.json(JSON.parse(result));
    } catch (e: any) {
        res.status(500).json({ error: 'AI processing failed', details: e.message });
    }
});

apiRouter.post('/ai/project', authMiddleware, async (req, res) => {
    try {
        const result = await aiService.polishProject(req.body.text);
        res.json(JSON.parse(result));
    } catch (e: any) {
        res.status(500).json({ error: 'AI processing failed', details: e.message });
    }
});

apiRouter.post('/ai/education', authMiddleware, async (req, res) => {
    try {
        const result = await aiService.polishEducation(req.body.text);
        res.json(JSON.parse(result));
    } catch (e: any) {
        res.status(500).json({ error: 'AI processing failed', details: e.message });
    }
});

apiRouter.post('/ai/assemble', authMiddleware, async (req, res) => {
    try {
        const { blocks, template } = req.body;
        const result = await aiService.assembleResume(blocks, template);
        res.send(result);
    } catch (e: any) {
        res.status(500).json({ error: 'AI assembly failed', details: e.message });
    }
});

apiRouter.post('/ai/command', authMiddleware, async (req, res) => {
    try {
        const result = await aiService.genericAiCommand(req.body.prompt);
        res.send(result);
    } catch (e: any) {
        res.status(500).json({ error: 'AI command failed', details: e.message });
    }
});

apiRouter.post('/ai/parse', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { content, autoSave, title, id } = req.body;
        const resultText = await aiService.parseResume(content);
        const parsedData = JSON.parse(resultText);

        if (autoSave && req.userId && parsedData) {
            const repo = AppDataSource.getRepository(Resume);
            const resumeTitle = title || 'Imported Resume';
            let resume = id ? await repo.findOne({ where: { id, userId: req.userId } }) : null;
            if (!resume) resume = await repo.findOne({ where: { title: resumeTitle, userId: req.userId } });

            if (resume) {
                resume.canvasData = parsedData;
            } else {
                resume = repo.create({ userId: req.userId, title: resumeTitle, canvasData: parsedData });
            }
            await repo.save(resume);
            return res.json({ message: 'Parsed and saved successfully', data: parsedData, resumeId: resume.id });
        }

        res.json(parsedData);
    } catch (e: any) {
        res.status(500).json({ error: 'AI parsing failed', details: e.message });
    }
});

apiRouter.post('/ai/optimize', authMiddleware, async (req, res) => {
    try {
        const { blocks, jd } = req.body;
        const result = await aiService.optimizeForJD(blocks, jd);
        res.json(JSON.parse(result));
    } catch (e: any) {
        res.status(500).json({ error: 'AI optimization failed', details: e.message });
    }
});

apiRouter.post('/ai/edit-file', authMiddleware, async (req, res) => {
    try {
        const { content, instruction, workspaceFiles } = req.body;
        if (!content && !instruction) return res.status(400).json({ error: 'content and instruction are required' });
        const result = await aiService.editLatexFile(content, instruction, workspaceFiles);
        res.send(result);
    } catch (e: any) {
        res.status(500).json({ error: 'AI file editing failed', details: e.message });
    }
});

// ── Mount API ─────────────────────────────────────────────────────────────────
app.use('/api/v1', apiRouter);

// ── Serve client in production ────────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
    const clientDist = path.join(process.cwd(), 'dist', 'client');
    if (fs.existsSync(clientDist)) {
        app.use(express.static(clientDist));
        app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
    }
}

// ── Startup ───────────────────────────────────────────────────────────────────
const isWin = process.platform === 'win32';
const TECTONIC_BIN = path.resolve(process.cwd(), '.bin', isWin ? 'tectonic.exe' : 'tectonic');

connectToDatabase().then(() => {
    const port = config.PORT;
    app.listen(port, '0.0.0.0', () => {
        console.log(`Server running on port ${port}`);
        console.log(`Tectonic: ${fs.existsSync(TECTONIC_BIN) ? 'READY at ' + TECTONIC_BIN : 'using system PATH'}`);
    });
});

export default app;

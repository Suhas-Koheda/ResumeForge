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

// ── Routers ──────────────────────────────────────────────────────────────────
import authRouter from './api/v1/auth.js';
import resumeRouter from './api/v1/resume.js';
import templateRouter from './api/v1/templates.js'; // Using templates.js for multi-template support
import filesRouter from './api/v1/files.js';
import importRouter from './api/v1/import.js';
import exportRouter from './api/v1/export.js';

// ── Routes ───────────────────────────────────────────────────────────────────
const apiRouter = express.Router();
apiRouter.use(ensureDb);

// Health check
apiRouter.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        mode: config.IS_LOCAL ? 'LOCAL' : 'CLOUD',
        db: config.IS_LOCAL ? 'sqlite' : 'postgres'
    });
});

// Modular Routers
apiRouter.use('/auth', authRouter);
apiRouter.use('/resumes', resumeRouter);
apiRouter.use('/templates', templateRouter);
apiRouter.use('/files', filesRouter);
apiRouter.use('/import', importRouter);
apiRouter.use('/export', exportRouter);

// AI Routes (keeping inline for now as they are central to this branch, or could move to aiRouter)
apiRouter.post('/ai/experience', authMiddleware, async (req, res) => {
    try {
        const result = await aiService.polishExperience(req.body.text, req.body.provider);
        res.json(JSON.parse(result));
    } catch (e: any) {
        res.status(500).json({ error: 'AI processing failed', details: e.message });
    }
});

apiRouter.post('/ai/skills', authMiddleware, async (req, res) => {
    try {
        const result = await aiService.polishSkills(req.body.text, req.body.provider);
        res.json(JSON.parse(result));
    } catch (e: any) {
        res.status(500).json({ error: 'AI processing failed', details: e.message });
    }
});

apiRouter.post('/ai/project', authMiddleware, async (req, res) => {
    try {
        const result = await aiService.polishProject(req.body.text, req.body.provider);
        res.json(JSON.parse(result));
    } catch (e: any) {
        res.status(500).json({ error: 'AI processing failed', details: e.message });
    }
});

apiRouter.post('/ai/education', authMiddleware, async (req, res) => {
    try {
        const result = await aiService.polishEducation(req.body.text, req.body.provider);
        res.json(JSON.parse(result));
    } catch (e: any) {
        res.status(500).json({ error: 'AI processing failed', details: e.message });
    }
});

apiRouter.post('/ai/assemble', authMiddleware, async (req, res) => {
    try {
        const { blocks, template, provider } = req.body;
        const result = await aiService.assembleResume(blocks, template, provider);
        res.send(result);
    } catch (e: any) {
        res.status(500).json({ error: 'AI assembly failed', details: e.message });
    }
});

apiRouter.post('/ai/command', authMiddleware, async (req, res) => {
    try {
        const result = await aiService.genericAiCommand(req.body.prompt, req.body.provider);
        res.send(result);
    } catch (e: any) {
        res.status(500).json({ error: 'AI command failed', details: e.message });
    }
});

apiRouter.post('/ai/parse', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { content, autoSave, title, id, provider } = req.body;

        // ALWAYS use the AI for parsing, regardless of whether it's LaTeX or Plain Text.
        const resultText = await aiService.parseResume(content, provider);
        let blocksArray: any[] = JSON.parse(resultText);

        if (autoSave && req.userId && blocksArray) {
            const repo = AppDataSource.getRepository(Resume);
            const resumeTitle = title || 'Imported Resume';
            let resume = id ? await repo.findOne({ where: { id, userId: req.userId } }) : null;
            if (!resume) resume = await repo.findOne({ where: { title: resumeTitle, userId: req.userId } });

            if (resume) {
                resume.canvasData = { nodes: blocksArray, projectFiles: [] };
            } else {
                resume = repo.create({ userId: req.userId, title: resumeTitle, canvasData: { nodes: blocksArray, projectFiles: [] } });
            }
            await repo.save(resume);
            return res.json({ message: 'Parsed and saved successfully', data: blocksArray, resumeId: resume.id });
        }

        res.json(blocksArray);
    } catch (e: any) {
        res.status(500).json({ error: 'AI parsing failed', details: e.message });
    }
});

apiRouter.post('/ai/optimize', authMiddleware, async (req, res) => {
    try {
        const { blocks, jd, provider } = req.body;
        const result = await aiService.optimizeForJD(blocks, jd, provider);
        res.json(JSON.parse(result));
    } catch (e: any) {
        res.status(500).json({ error: 'AI optimization failed', details: e.message });
    }
});

apiRouter.post('/ai/edit-file', authMiddleware, async (req, res) => {
    try {
        const { content, instruction, workspaceFiles, provider } = req.body;
        if (!content && !instruction) return res.status(400).json({ error: 'content and instruction are required' });
        const result = await aiService.editLatexFile(content, instruction, workspaceFiles, provider);
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

import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { DataSource } from 'typeorm';
import { config } from './core/config.js';
import authRouter from './api/v1/auth.js';
import resumeRouter from './api/v1/resume.js';
import exportRouter from './api/v1/export.js';
import importRouter from './api/v1/import.js';
import templatesRouter from './api/v1/templates.js';
import filesRouter from './api/v1/files.js';
import { aiService } from './services/ai.js';
import { authMiddleware, AuthRequest } from './core/auth.js';
import { verificationMiddleware } from './core/verification.js';
import { User } from './entities/User.entity.js';
import { Resume } from './entities/Resume.entity.js';
import { AppDataSource, connectToDatabase } from './core/database.js';

import path from 'path';
import fs from 'fs';

const app = express();

console.log("=== SERVER STARTUP ===");
console.log(`Starting in ${config.IS_LOCAL ? 'LOCAL' : 'PRODUCTION'} mode`);
console.log("======================");

// Middlewares for Security and Parsing
app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for easier development, can be tightened later
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
}));

app.use(express.json());

// Enable "trust proxy" so express-rate-limit can see the real client IP
// behind proxies like Nginx, Vercel, or cloud load balancers.
app.set('trust proxy', 1);

// Set up rate limiting to prevent brute force/DDoS
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500, // Increased slightly for resume building activity
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// Request logging (Simple security audit trail)
app.use((req, res, next) => {
    if (config.IS_LOCAL) {
        console.log(`[LOG_REQUEST] ${req.method} ${req.url}`);
    }
    next();
});

// Routes
app.get(['/api/health', '/.netlify/functions/server/health'], async (req, res) => {
    try {
        await connectToDatabase();
        return res.json({
            status: 'ok',
            mode: config.IS_LOCAL ? 'LOCAL' : 'CLOUD',
            db_state: 'connected'
        });
    } catch (e: any) {
        return res.status(500).json({
            status: 'error',
            message: 'Database check failed',
            details: e.message
        });
    }
});

const apiRouter = express.Router();

apiRouter.use(async (req, res, next) => {
    try {
        await connectToDatabase();
        next();
    } catch (e) {
        res.status(500).json({ error: 'Database connection failed' });
    }
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/resumes', authMiddleware, verificationMiddleware, resumeRouter);
apiRouter.use('/export', authMiddleware, verificationMiddleware, exportRouter);
apiRouter.use('/import', authMiddleware, verificationMiddleware, importRouter);
apiRouter.use('/templates', authMiddleware, templatesRouter);
apiRouter.use('/files', authMiddleware, verificationMiddleware, filesRouter);

apiRouter.post('/ai/experience', authMiddleware, verificationMiddleware, async (req, res) => {
    try {
        const { text } = req.body;
        const result = await aiService.polishExperience(text);
        res.json(JSON.parse(result));
    } catch (error) {
        res.status(500).json({ error: 'AI processing failed' });
    }
});

apiRouter.post('/ai/assemble', authMiddleware, verificationMiddleware, async (req, res) => {
    try {
        const { blocks, template } = req.body;
        const result = await aiService.assembleResume(blocks, template);
        res.send(result);
    } catch (error: any) {
        console.error("[LOG_API_ROUTE] AI assembly failed:", error);
        res.status(500).json({ error: 'AI assembly failed', details: error.message });
    }
});

apiRouter.post('/ai/command', authMiddleware, verificationMiddleware, async (req, res) => {
    try {
        const { prompt } = req.body;
        const result = await aiService.genericAiCommand(prompt);
        res.send(result);
    } catch (error: any) {
        console.error("[LOG_API_ROUTE] AI command failed:", error);
        res.status(500).json({ error: 'AI command failed', details: error.message });
    }
});

apiRouter.post('/ai/parse', authMiddleware, verificationMiddleware, async (req: AuthRequest, res) => {
    try {
        const { content, autoSave, title, id } = req.body;
        const resultText = await aiService.parseResume(content);
        const parsedData = JSON.parse(resultText);

        // If parsing was successful and autoSave is requested, save to DB
        if (autoSave && req.userId && parsedData) {
            const resumeRepo = AppDataSource.getRepository(Resume);
            const resumeTitle = title || "Imported Resume";

            let resume: Resume | null = null;

            // 1. Try by ID if provided
            if (id) {
                resume = await resumeRepo.findOne({ where: { id, userId: req.userId } });
            }

            // 2. Fallback to title + search if no ID or not found
            if (!resume) {
                resume = await resumeRepo.findOne({ where: { title: resumeTitle, userId: req.userId } });
            }

            if (resume) {
                resume.canvasData = parsedData;
                await resumeRepo.save(resume);
            } else {
                resume = resumeRepo.create({
                    userId: req.userId,
                    title: resumeTitle,
                    canvasData: parsedData
                });
                await resumeRepo.save(resume);
            }
            return res.json({ message: "Parsed and saved successfully", data: parsedData, resumeId: resume.id });
        }

        res.json(parsedData);
    } catch (error: any) {
        console.error("[LOG_API_ROUTE] AI parsing failed:", error);
        res.status(500).json({ error: 'AI parsing failed', details: error.message });
    }
});

apiRouter.post('/ai/skills', authMiddleware, verificationMiddleware, async (req, res) => {
    try {
        const { text } = req.body;
        const result = await aiService.polishSkills(text);
        res.json(JSON.parse(result));
    } catch (error) {
        res.status(500).json({ error: 'AI processing failed' });
    }
});

apiRouter.post('/ai/project', authMiddleware, verificationMiddleware, async (req, res) => {
    try {
        const { text } = req.body;
        const result = await aiService.polishProject(text);
        res.json(JSON.parse(result));
    } catch (error) {
        res.status(500).json({ error: 'AI processing failed' });
    }
});

apiRouter.post('/ai/education', authMiddleware, verificationMiddleware, async (req, res) => {
    try {
        const { text } = req.body;
        const result = await aiService.polishEducation(text);
        res.json(JSON.parse(result));
    } catch (error) {
        res.status(500).json({ error: 'AI processing failed' });
    }
});

apiRouter.post('/ai/optimize', authMiddleware, verificationMiddleware, async (req, res) => {
    try {
        const { blocks, jd } = req.body;
        const resultText = await aiService.optimizeForJD(blocks, jd);
        res.json(JSON.parse(resultText));
    } catch (error: any) {
        console.error("[LOG_API_ROUTE] AI optimization failed:", error);
        res.status(500).json({ error: 'AI optimization failed', details: error.message });
    }
});

apiRouter.post('/ai/edit-file', authMiddleware, verificationMiddleware, async (req, res) => {
    try {
        const { content, instruction, workspaceFiles } = req.body;
        if (!content || !instruction) {
            return res.status(400).json({ error: 'Content and instruction are required' });
        }
        const result = await aiService.editLatexFile(content, instruction, workspaceFiles);
        res.send(result);
    } catch (error: any) {
        console.error("[LOG_API_ROUTE] AI file editing failed:", error);
        res.status(500).json({ error: 'AI file editing failed', details: error.message });
    }
});

app.use(['/api/v1', '/.netlify/functions/server/v1'], apiRouter);

const IS_SERVERLESS = !!process.env.VERCEL || !!process.env.NETLIFY || process.env.VITE_VERCEL === 'true';

// Serve static frontend in production
if (process.env.NODE_ENV === 'production' && !IS_SERVERLESS) {
    const clientDist = path.join(process.cwd(), 'dist', 'client');
    if (fs.existsSync(clientDist)) {
        app.use(express.static(clientDist));
        app.get('*', (req, res) => {
            res.sendFile(path.join(clientDist, 'index.html'));
        });
    }
}

if (!IS_SERVERLESS) {
    connectToDatabase().then(() => {
        const isWin = process.platform === 'win32';
        const TECTONIC_BIN = path.resolve(process.cwd(), '.bin', isWin ? 'tectonic.exe' : 'tectonic');
        const binaryStatus = fs.existsSync(TECTONIC_BIN) ? 'READY' : 'ABSENT (will use PATH)';

        const port = Number(config.PORT || 5000);
        app.listen(port, '0.0.0.0', () => {
            console.log(`Server running on port ${port} [${config.IS_LOCAL ? 'LOCAL MODE' : 'PRODUCTION'}]`);
            console.log(`Tectonic Engine: ${binaryStatus} at ${TECTONIC_BIN}`);
            console.log(`--- Express Listener Active ---`);
        });
    });
}

export default app;

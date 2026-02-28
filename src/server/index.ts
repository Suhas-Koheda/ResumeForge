import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import { DataSource } from 'typeorm';
import { config } from './core/config.js';
import authRouter from './api/v1/auth.js';
import resumeRouter from './api/v1/resume.js';
import exportRouter from './api/v1/export.js';
import importRouter from './api/v1/import.js';
import { aiService } from './services/ai.js';
import { authMiddleware } from './core/auth.js';
import { User } from './entities/User.entity.js';
import { Resume } from './entities/Resume.entity.js';
import { AppDataSource, connectToDatabase } from './core/database.js';

import path from 'path';
import fs from 'fs';

const app = express();

console.log("=== DIAGNOSTIC LOG (SERVER STARTUP) ===");
console.log("DB URL (config.MONGODB_URI):", config.MONGODB_URI);
console.log("DB USERNAME:", config.DB_USERNAME);
console.log("DB PASSWORD:", config.DB_PASSWORD ? 'SET' : 'NOT SET');
console.log("JWT SECRET:", config.JWT_SECRET ? 'SET' : 'NOT SET');
console.log("process.env.DB_URL:", process.env.DB_URL);
console.log("=======================================");
// Middleware
app.use(cors({
    origin: (origin, callback) => callback(null, true), // Echo whatever origin asks for
    credentials: true,
}));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
    if (config.IS_LOCAL) {
        console.log(`[LOG_REQUEST] ${req.method} ${req.url}`);
    }
    next();
});

// DB and Server Lifecycle is handled by individual handlers (Serverless) or below (Local)

// Routes
app.get(['/api/health', '/.netlify/functions/server/health'], async (req, res) => {
    try {
        await connectToDatabase(); // Truly check connection
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
apiRouter.use('/resumes', resumeRouter);
apiRouter.use('/export', exportRouter);
apiRouter.use('/import', importRouter);

apiRouter.post('/ai/experience', authMiddleware, async (req, res) => {
    try {
        const { text } = req.body;
        const result = await aiService.polishExperience(text);
        res.json(JSON.parse(result));
    } catch (error) {
        res.status(500).json({ error: 'AI processing failed' });
    }
});

apiRouter.post('/ai/assemble', authMiddleware, async (req, res) => {
    try {
        const { blocks, template } = req.body;
        const result = await aiService.assembleResume(blocks, template);
        res.send(result);
    } catch (error: any) {
        console.error("[LOG_API_ROUTE] AI assembly failed:", error);
        res.status(500).json({ error: 'AI assembly failed', details: error.message });
    }
});

apiRouter.post('/ai/parse', authMiddleware, async (req, res) => {
    try {
        const { content } = req.body;
        const result = await aiService.parseResume(content);
        res.json(JSON.parse(result));
    } catch (error: any) {
        console.error("[LOG_API_ROUTE] AI parsing failed:", error);
        res.status(500).json({ error: 'AI parsing failed', details: error.message });
    }
});

app.use(['/api/v1', '/.netlify/functions/server/v1'], apiRouter);

const IS_SERVERLESS = !!process.env.VERCEL || !!process.env.NETLIFY || process.env.VITE_VERCEL === 'true';

// Serve static frontend in production (Render, Heroku, etc)
if (process.env.NODE_ENV === 'production' && !IS_SERVERLESS) {
    const clientDist = path.join(process.cwd(), 'dist', 'client');
    app.use(express.static(clientDist));

    app.get('*', (req, res) => {
        res.sendFile(path.join(clientDist, 'index.html'));
    });
}

if (!IS_SERVERLESS) {
    connectToDatabase().then(() => {
        const TECTONIC_BIN = path.resolve(process.cwd(), '.bin/tectonic');
        const binaryStatus = fs.existsSync(TECTONIC_BIN) ? 'READY' : 'ABSENT (will use PATH)';

        console.log(`Server running on port ${config.PORT || 5000} [${config.IS_LOCAL ? 'LOCAL MODE' : 'PRODUCTION'}]`);
        console.log(`Tectonic Engine: ${binaryStatus} at ${TECTONIC_BIN}`);

        app.listen(Number(config.PORT || 5000), '0.0.0.0', () => {
            console.log(`--- Express Listener Active ---`);
        });
    });
}

export default app;

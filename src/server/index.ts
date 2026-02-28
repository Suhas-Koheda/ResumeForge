import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import { DataSource } from 'typeorm';
import { config } from './core/config.js';
import authRouter from './api/v1/auth.js';
import resumeRouter from './api/v1/resume.js';
import exportRouter from './api/v1/export.js';
import { aiService } from './services/ai.js';
import { authMiddleware } from './core/auth.js';
import { User } from './entities/User.entity.js';
import { Resume } from './entities/Resume.entity.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors({
    origin: process.env.VITE_VERCEL === 'true' ? ['https://resumeforge.vercel.app', 'http://localhost:5173'] : config.ALLOWED_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json());

// TypeORM Data Source for Serverless PostgreSQL
export const AppDataSource = new DataSource(
    config.IS_LOCAL
        ? {
            type: "sqlite",
            database: "local_dev.sqlite",
            synchronize: true,
            logging: true,
            entities: [User, Resume],
            subscribers: [],
            migrations: [],
        }
        : {
            type: "postgres",
            url: config.MONGODB_URI.startsWith('jdbc:') ? config.MONGODB_URI.replace('jdbc:postgresql://', 'postgres://') : config.MONGODB_URI,
            synchronize: true, // Set to true to auto-create tables in Neon for now
            logging: false,
            entities: [User, Resume],
            subscribers: [],
            migrations: [],
            ssl: { rejectUnauthorized: false },
            extra: {
                max: 5, // Connection pool size limit for Serverless environments
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 5000
            }
        }
);

let dbConnectionPromise: Promise<DataSource> | null = null;
async function connectToDatabase() {
    if (!dbConnectionPromise) {
        dbConnectionPromise = AppDataSource.initialize().then(ds => {
            console.log(`--- ${config.IS_LOCAL ? 'SQLite' : 'Postgres'} Database Connected ---`);
            return ds;
        }).catch(err => {
            console.error("Database connection error:", err);
            throw err;
        });
    }
    await dbConnectionPromise;
}

// Routes
app.get('/api/health', (req, res) => res.json({
    status: 'ok',
    mode: config.IS_LOCAL ? 'LOCAL' : 'CLOUD',
    db_state: 'connected'
}));

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

if (process.env.NODE_ENV !== 'production' && !IS_SERVERLESS) {
    connectToDatabase().then(() => {
        app.listen(config.PORT || 5000, () => {
            console.log(`Server running on port ${config.PORT || 5000} [${config.IS_LOCAL ? 'LOCAL MODE' : 'PRODUCTION'}]`);
        });
    });
}

export default app;

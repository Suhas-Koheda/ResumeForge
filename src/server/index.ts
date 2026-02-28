import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import { DataSource } from 'typeorm';
import { config } from '@server/core/config';
import authRouter from '@server/api/v1/auth';
import resumeRouter from '@server/api/v1/resume';
import exportRouter from '@server/api/v1/export';
import { aiService } from '@server/services/ai';
import { authMiddleware } from '@server/core/auth';
import { User } from '@server/entities/User.entity';
import { Resume } from '@server/entities/Resume.entity';

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
            synchronize: false,
            logging: false,
            entities: [User, Resume],
            subscribers: [],
            migrations: [],
            ssl: { rejectUnauthorized: false },
            extra: {
                max: 5, // Connection pool size limit for Serverless environments
                idleTimeoutMillis: 30000 
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

app.use('/api/v1', apiRouter);

// Serve static files in production (Fallback)
if (process.env.VITE_VERCEL !== 'true') {
    const distPath = path.join(__dirname, '../../../dist/client');
    app.use(express.static(distPath));

    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        res.sendFile(path.join(distPath, 'index.html'));
    });

    connectToDatabase().then(() => {
        app.listen(config.PORT, () => {
            console.log(`Server running on port ${config.PORT} [${config.IS_LOCAL ? 'LOCAL MODE' : 'PRODUCTION'}]`);
        });
    });
}

export default app;

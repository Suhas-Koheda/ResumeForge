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
    origin: config.ALLOWED_ORIGINS,
    credentials: true
}));
app.use(express.json());

// TypeORM Data Source (Postgres)
export const AppDataSource = new DataSource({
    type: "postgres",
    url: config.MONGODB_URI.startsWith('jdbc:') ? config.MONGODB_URI.replace('jdbc:postgresql://', 'postgres://') : config.MONGODB_URI,
    synchronize: config.IS_LOCAL,
    logging: config.IS_LOCAL,
    entities: [User, Resume],
    subscribers: [],
    migrations: [],
    ssl: config.MONGODB_URI.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

let isInitialized = false;
async function connectToDatabase() {
    if (isInitialized) return;
    try {
        await AppDataSource.initialize();
        isInitialized = true;
        console.log("--- Postgres Database Connected ---");
    } catch (error) {
        console.error("Database connection error:", error);
    }
}

// Routes
app.get('/health', (req, res) => res.json({
    status: 'ok',
    mode: config.IS_LOCAL ? 'LOCAL' : 'CLOUD',
    db_state: isInitialized ? 'connected' : 'disconnected'
}));

app.use('/api/v1/auth', async (req, res, next) => {
    await connectToDatabase();
    authRouter(req, res, next);
});

app.use('/api/v1/resumes', async (req, res, next) => {
    await connectToDatabase();
    resumeRouter(req, res, next);
});

app.use('/api/v1/export', exportRouter);

app.post('/api/v1/ai/experience', authMiddleware, async (req, res) => {
    try {
        const { text } = req.body;
        const result = await aiService.polishExperience(text);
        res.json(JSON.parse(result));
    } catch (error) {
        res.status(500).json({ error: 'AI processing failed' });
    }
});

app.post('/api/v1/ai/assemble', authMiddleware, async (req, res) => {
    try {
        const { blocks, template } = req.body;
        const result = await aiService.assembleResume(blocks, template);
        res.send(result);
    } catch (error) {
        res.status(500).json({ error: 'AI assembly failed' });
    }
});

// Serve static files in production
const distPath = path.join(__dirname, '../../../dist/client');
app.use(express.static(distPath));

// Auth and API routes are defined above

// Handle SPA routing
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
});

if (process.env.VITE_VERCEL !== 'true') {
    connectToDatabase().then(() => {
        app.listen(config.PORT, () => {
            console.log(`Server running on port ${config.PORT} [${config.IS_LOCAL ? 'LOCAL MODE' : 'PRODUCTION'}]`);
        });
    });
}

export default app;

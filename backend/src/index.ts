import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { config } from './core/config.js';
import authRouter from './api/v1/auth.js';
import resumeRouter from './api/v1/resume.js';
import exportRouter from './api/v1/export.js';
import { aiService } from './services/ai.js';
import { authMiddleware } from './core/auth.js';

const app = express();

// Middleware
app.use(cors({ origin: config.ALLOWED_ORIGINS }));
app.use(express.json());

// Public Routes
app.get('/health', (req, res) => res.json({ status: 'ok', environment: config.IS_LOCAL ? 'local' : 'production' }));
app.use('/api/v1/auth', authRouter);

// Protected Routes
app.use('/api/v1/resumes', resumeRouter);
app.use('/api/v1/export', exportRouter);

// AI Route (Protected)
app.post('/api/v1/ai/polish', authMiddleware, async (req, res) => {
    try {
        const { text } = req.body;
        const polished = await aiService.polishPoint(text);
        res.json({ polished });
    } catch (error) {
        res.status(500).json({ error: 'Failed to polish text' });
    }
});

// Database Connection & Server Start
mongoose.connect(config.MONGODB_URI)
    .then(() => {
        console.log('--- Database Connected ---');
        console.log(`Environment: ${config.IS_LOCAL ? 'Local' : 'Production'}`);
        app.listen(config.PORT, () => {
            console.log(`Server is running on port ${config.PORT}`);
        });
    })
    .catch(err => {
        console.error('Database connection failed:', err);
        process.exit(1);
    });

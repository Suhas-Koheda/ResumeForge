import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../../core/database.js';
import { User } from '../../entities/User.entity.js';
import { config } from '../../core/config.js';

const router = express.Router();

router.post('/register', async (req, res) => {
    try {
        console.log("=== DIAGNOSTIC LOG ===");
        console.log("DB URL (config.MONGODB_URI):", config.MONGODB_URI);
        console.log("DB USERNAME:", config.DB_USERNAME);
        console.log("DB PASSWORD:", config.DB_PASSWORD ? 'SET' : 'NOT SET');
        console.log("JWT SECRET:", config.JWT_SECRET ? 'SET' : 'NOT SET');
        console.log("process.env.DB_URL:", process.env.DB_URL);
        console.log("======================");
        
        const { email, password } = req.body;
        const userRepo = AppDataSource.getRepository(User);

        const existing = await userRepo.findOne({ where: { email } });
        if (existing) return res.status(400).json({ error: 'User already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = userRepo.create({ email, password: hashedPassword });
        await userRepo.save(user);

        res.status(201).json({ message: 'User created' });
    } catch (error) {
        res.status(500).json({ error: 'Registration failed' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const userRepo = AppDataSource.getRepository(User);

        const user = await userRepo.findOne({ where: { email } });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user.id }, config.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token });
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});

export default router;

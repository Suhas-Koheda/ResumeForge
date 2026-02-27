import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { config } from '../core/config.js';

const router = express.Router();

router.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        const passwordHash = await bcrypt.hash(password, 10);
        const user = new User({ email, passwordHash });
        await user.save();
        res.status(201).json({ message: 'User created' });
    } catch (error) {
        res.status(500).json({ error: 'Registration failed' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jwt.sign({ userId: user._id }, config.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token });
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});

export default router;

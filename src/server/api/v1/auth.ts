import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../../core/database.js';
import { User } from '../../entities/User.entity.js';
import { config } from '../../core/config.js';

import { emailService } from '../../services/email.js';
import crypto from 'crypto';

const router = express.Router();

router.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        const userRepo = AppDataSource.getRepository(User);

        const existing = await userRepo.findOne({ where: { email } });
        if (existing) return res.status(400).json({ error: 'User already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate a simple verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');

        const user = userRepo.create({
            email,
            password: hashedPassword,
            verificationToken,
            isVerified: false
        });
        await userRepo.save(user);

        // Send email in background (don't block the response)
        emailService.sendVerificationEmail(email, verificationToken).catch(e => {
            console.error("[AUTH] Verification email failed:", e);
        });

        res.status(201).json({ message: 'User created successfully. Please check your email to verify your account.' });
    } catch (error) {
        console.error("[AUTH] Registration error:", error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

router.get('/verify', async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) return res.status(400).json({ error: 'Token is required' });

        const userRepo = AppDataSource.getRepository(User);
        const user = await userRepo.findOne({ where: { verificationToken: token as string } });

        if (!user) {
            return res.status(404).json({ error: 'Invalid or expired verification token' });
        }

        user.isVerified = true;
        user.verificationToken = undefined; // Clear token after verification
        await userRepo.save(user);

        res.json({ message: 'Email verified successfully! You can now log in.' });
    } catch (error) {
        console.error("[AUTH] Verification error:", error);
        res.status(500).json({ error: 'Verification failed' });
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

        // Check if user is verified
        if (!user.isVerified) {
            return res.status(403).json({ error: 'Please verify your email address before logging in.' });
        }

        const token = jwt.sign({ userId: user.id }, config.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token });
    } catch (error) {
        console.error("[AUTH] Login error:", error);
        res.status(500).json({ error: 'Login failed' });
    }
});

router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const userRepo = AppDataSource.getRepository(User);
        const user = await userRepo.findOne({ where: { email } });

        // For security, don't reveal if user exists or not
        if (!user) {
            return res.json({ message: 'If an account exists with that email, a reset link has been sent.' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
        await userRepo.save(user);

        await emailService.sendPasswordResetEmail(email, resetToken);

        res.json({ message: 'If an account exists with that email, a reset link has been sent.' });
    } catch (error) {
        console.error("[AUTH] Forgot password error:", error);
        res.status(500).json({ error: 'Failed to process request' });
    }
});

router.post('/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;
        const userRepo = AppDataSource.getRepository(User);

        const user = await userRepo.findOne({
            where: { resetPasswordToken: token }
        });

        if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
            return res.status(400).json({ error: 'Password reset token is invalid or has expired' });
        }

        user.password = await bcrypt.hash(password, 10);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await userRepo.save(user);

        res.json({ message: 'Password has been reset successfully. You can now log in.' });
    } catch (error) {
        console.error("[AUTH] Reset password error:", error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

export default router;

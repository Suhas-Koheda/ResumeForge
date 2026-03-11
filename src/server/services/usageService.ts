import { AppDataSource } from '../core/database.js';
import { Resume } from '../entities/Resume.entity.js';
import { AiUsage } from '../entities/AiUsage.entity.js';
import { config } from '../core/config.js';
import { LessThan, MoreThan } from 'typeorm';

export class UsageService {
    private static RESUME_LIMIT = 3;
    private static AI_HOURLY_LIMIT = 3;
    private static AI_DAILY_LIMIT = 6;

    /**
     * Checks if the user has reached the resume limit.
     * Only enforced in CLOUD mode.
     */
    static async checkResumeLimit(userId: string): Promise<{ allowed: boolean; count: number; limit: number; message?: string }> {
        if (config.IS_LOCAL) return { allowed: true, count: 0, limit: Infinity };

        const resumeRepo = AppDataSource.getRepository(Resume);
        const count = await resumeRepo.count({ where: { userId } });

        if (count >= this.RESUME_LIMIT) {
            return {
                allowed: false,
                count,
                limit: this.RESUME_LIMIT,
                message: `You have reached the limit of ${this.RESUME_LIMIT} resumes. To create more, please delete existing ones or run ResumeForge locally: https://github.com/suhas-Koheda/resumeforge`
            };
        }

        return { allowed: true, count, limit: this.RESUME_LIMIT };
    }

    /**
     * Checks if the user has reached the AI compile limit.
     * Only enforced in CLOUD mode.
     */
    static async checkAiLimit(userId: string): Promise<{ allowed: boolean; hourCount: number; dayCount: number; message?: string }> {
        if (config.IS_LOCAL) return { allowed: true, hourCount: 0, dayCount: 0 };

        const aiRepo = AppDataSource.getRepository(AiUsage);
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const hourCount = await aiRepo.count({
            where: {
                userId,
                createdAt: MoreThan(oneHourAgo)
            }
        });

        const dayCount = await aiRepo.count({
            where: {
                userId,
                createdAt: MoreThan(oneDayAgo)
            }
        });

        if (hourCount >= this.AI_HOURLY_LIMIT) {
            return {
                allowed: false,
                hourCount,
                dayCount,
                message: `Hourly AI limit reached (${this.AI_HOURLY_LIMIT}). Please wait a while or run ResumeForge locally for unlimited usage: https://github.com/suhas-Koheda/resumeforge`
            };
        }

        if (dayCount >= this.AI_DAILY_LIMIT) {
            return {
                allowed: false,
                hourCount,
                dayCount,
                message: `Daily AI limit reached (${this.AI_DAILY_LIMIT}). Come back tomorrow or run ResumeForge locally for unlimited usage: https://github.com/suhas-Koheda/resumeforge`
            };
        }

        return { allowed: true, hourCount, dayCount };
    }

    /**
     * Records an AI action.
     */
    static async recordAiAction(userId: string, action: string) {
        if (config.IS_LOCAL) return;
        const aiRepo = AppDataSource.getRepository(AiUsage);
        const usage = aiRepo.create({ userId, action });
        await aiRepo.save(usage);
    }
}

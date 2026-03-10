import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ResumeBlock } from '../../shared/types.js';

@Entity('resumes')
export class Resume {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar' })
    userId!: string;

    @Column({ type: 'varchar', default: 'Untitled Resume' })
    title!: string;

    /**
     * Stored as plain JSON text in local SQLite.
     * No encryption needed for a local-only app.
     */
    @Column({
        type: 'text',
        nullable: true,
        transformer: {
            to: (value: any) => (value ? JSON.stringify(value) : null),
            from: (value: string | null) => {
                if (!value) return { nodes: [], customTemplate: '' };
                try {
                    return JSON.parse(value);
                } catch {
                    return { nodes: [], customTemplate: '' };
                }
            },
        },
    })
    canvasData: {
        nodes: ResumeBlock[];
        customTemplate?: string;
        projectFiles?: any[];
        activeFileName?: string;
    } = { nodes: [], customTemplate: '' };

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}

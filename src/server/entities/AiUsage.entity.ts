import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('ai_usage')
export class AiUsage {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Index()
    @Column({ type: 'varchar' })
    userId!: string;

    @Column({ type: 'varchar' })
    action!: string; // e.g. 'assemble', 'polish', 'parse'

    @CreateDateColumn()
    createdAt!: Date;
}

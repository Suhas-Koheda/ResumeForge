import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { Template } from './Template.entity.js';

@Entity('template_versions')
export class TemplateVersion {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => Template, template => template.versions, { onDelete: 'CASCADE' })
    template!: Template;

    @Column('int')
    version!: number;

    @Column({ type: 'text', default: '{}' })
    config!: string; // serialized JSON

    @Column({ type: 'text' })
    preamble!: string;

    @CreateDateColumn()
    createdAt!: Date;
}

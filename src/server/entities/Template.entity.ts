import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne } from 'typeorm';

/**
 * A LaTeX template stored in the local SQLite database.
 * No User relation — local-only, single-user.
 */
@Entity('templates')
export class Template {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    /** Stored for future multi-workspace support; defaults to 'local-dev-user'. */
    @Column({ type: 'varchar', default: 'local-dev-user' })
    userId!: string;

    @Column({ type: 'varchar' })
    name!: string;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({ type: 'text', default: '{}' })
    config!: string; // Serialized JSON: fonts, colors, layout options

    @Column({ type: 'text', default: '' })
    preamble!: string;

    @Column({ type: 'text', default: '{}' })
    styles!: string; // Serialized JSON: section styles

    @Column('int', { default: 1 })
    version!: number;

    @Column({ type: 'text', nullable: true })
    thumbnail?: string;

    @Column({ type: 'boolean', default: false })
    isPublic!: boolean;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @OneToMany(() => TemplateVersion, (v: TemplateVersion) => v.template)
    versions!: TemplateVersion[];
}

@Entity('template_versions')
export class TemplateVersion {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => Template, (template: Template) => template.versions, { onDelete: 'CASCADE' })
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

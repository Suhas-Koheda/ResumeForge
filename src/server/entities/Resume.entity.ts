import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { ResumeBlock } from "@shared/types.js";

@Entity("resumes")
export class Resume {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: "varchar" })
    userId!: string;

    @Column({ type: "varchar", default: "Untitled Resume" })
    title!: string;

    @Column({ type: "jsonb", nullable: true })
    canvasData: {
        nodes: ResumeBlock[];
        customTemplate?: string;
    } = { nodes: [], customTemplate: "" };

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}

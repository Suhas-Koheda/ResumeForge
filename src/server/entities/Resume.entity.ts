import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { ResumeBlock } from "@shared/types.js";

@Entity()
export class Resume {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column()
    userId: string;

    @Column({ default: "Untitled Resume" })
    title: string;

    @Column("jsonb", { default: { nodes: [], customTemplate: "" } })
    canvasData: {
        nodes: ResumeBlock[];
        customTemplate?: string;
    };

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

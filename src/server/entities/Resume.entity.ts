import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { ResumeBlock } from "@shared/types.js";

@Entity()
export class Resume {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: "varchar" })
    userId!: string;

    @Column({ type: "varchar", default: "Untitled Resume" })
    title!: string;

    @Column("simple-json", { default: { nodes: [], customTemplate: "" } })
    canvasData!: {
        nodes: ResumeBlock[];
        customTemplate?: string;
    };

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ValueTransformer } from "typeorm";
import { ResumeBlock } from "../../shared/types.js";
import { encryptionService } from "../core/encryption.js";

const EncryptionTransformer: ValueTransformer = {
    to: (value: any) => {
        if (!value) return value;
        const stringified = JSON.stringify(value);
        return encryptionService.encrypt(stringified);
    },
    from: (value: string) => {
        if (!value || typeof value !== 'string') return value;
        try {
            const decrypted = encryptionService.decrypt(value);
            return JSON.parse(decrypted);
        } catch (e) {
            console.warn("[LOG_ENTITY] Failed to parse decrypted canvasData, returning raw value");
            return value;
        }
    }
};

@Entity("resumes")
export class Resume {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: "varchar" })
    userId!: string;

    @Column({ type: "varchar", default: "Untitled Resume" })
    title!: string;

    @Column({
        type: "text",
        nullable: true,
        transformer: EncryptionTransformer
    })
    canvasData: {
        nodes: ResumeBlock[];
        customTemplate?: string;
    } = { nodes: [], customTemplate: "" };

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}

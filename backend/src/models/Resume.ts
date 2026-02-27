import mongoose, { Schema, Document } from 'mongoose';

export interface IResume extends Document {
    userId: string;
    title: string;
    canvasData: {
        nodes: any[];
        customTemplate?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

const ResumeSchema: Schema = new Schema({
    userId: { type: String, required: true },
    title: { type: String, required: true, default: 'Untitled Resume' },
    canvasData: {
        nodes: { type: Array, default: [] },
        customTemplate: { type: String, default: '' }
    }
}, { timestamps: true });

export const Resume = mongoose.model<IResume>('Resume', ResumeSchema);

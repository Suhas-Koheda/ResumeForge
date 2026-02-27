import React from 'react';
import { ResumeBlock, BlockType } from '../../types/block';
import { ExperienceBlock } from '../blocks/ExperienceBlock';
import { EducationBlock } from '../blocks/EducationBlock';
import { SkillsBlock } from '../blocks/SkillsBlock';
import { ProjectBlock } from '../blocks/ProjectBlock';
import { HeaderBlock } from '../blocks/HeaderBlock';

/**
 * Scalable Block Registry
 * To add a new block type:
 * 1. Create the component
 * 2. Add the type to BlockType union
 * 3. Register here
 */
const BLOCK_REGISTRY: Record<BlockType, React.FC<{ id: string; data: any }>> = {
    experience: ExperienceBlock,
    education: EducationBlock,
    skills: SkillsBlock,
    project: ProjectBlock,
    header: HeaderBlock,
};

interface BlockRendererProps {
    block: ResumeBlock;
}

export const BlockRenderer: React.FC<BlockRendererProps> = ({ block }) => {
    const { type, id, data } = block;

    // Look up component in registry
    const Component = BLOCK_REGISTRY[type];

    if (!Component) {
        return (
            <div className="p-4 border-2 border-dashed border-red-200 bg-red-50 text-red-600 rounded-lg text-sm font-medium">
                Error: Node type "{type}" is not registered in BLOCK_REGISTRY.
            </div>
        );
    }

    return <Component id={id} data={data} />;
};

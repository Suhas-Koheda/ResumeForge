import React, { memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Briefcase, GraduationCap, Code, Rocket, Trash2, User } from 'lucide-react';
import { ResumeBlock } from '@shared/types';
import { BlockRenderer } from './BlockRenderer';
import { useBlock } from '../../hooks/useResume';

interface DraggableBlockProps {
    block: ResumeBlock;
}

const getBlockMeta = (type: string) => {
    switch (type) {
        case 'header': return { 
            icon: User, 
            color: 'text-blue-600 dark:text-blue-400', 
            bg: 'bg-blue-50 dark:bg-blue-900/30', 
            border: 'border-blue-200 dark:border-blue-800/50',
            band: 'bg-blue-500'
        };
        case 'experience': return { 
            icon: Briefcase, 
            color: 'text-emerald-600 dark:text-emerald-400', 
            bg: 'bg-emerald-50 dark:bg-emerald-900/30', 
            border: 'border-emerald-200 dark:border-emerald-800/50',
            band: 'bg-emerald-500'
        };
        case 'education': return { 
            icon: GraduationCap, 
            color: 'text-violet-600 dark:text-violet-400', 
            bg: 'bg-violet-50 dark:bg-violet-900/30', 
            border: 'border-violet-200 dark:border-violet-800/50',
            band: 'bg-violet-500'
        };
        case 'skills': return { 
            icon: Code, 
            color: 'text-amber-600 dark:text-amber-400', 
            bg: 'bg-amber-50 dark:bg-amber-900/30', 
            border: 'border-amber-200 dark:border-amber-800/50',
            band: 'bg-amber-500'
        };
        case 'project': return { 
            icon: Rocket, 
            color: 'text-rose-600 dark:text-rose-400', 
            bg: 'bg-rose-50 dark:bg-rose-900/30', 
            border: 'border-rose-200 dark:border-rose-800/50',
            band: 'bg-rose-500'
        };
        default: return { 
            icon: Briefcase, 
            color: 'text-zinc-600 dark:text-zinc-400', 
            bg: 'bg-zinc-50 dark:bg-zinc-900/30', 
            border: 'border-zinc-200 dark:border-zinc-800/50',
            band: 'bg-zinc-500'
        };
    }
}

export const DraggableBlock: React.FC<DraggableBlockProps> = memo(({ block }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        isDragging,
    } = useDraggable({ id: block.id });

    const { remove } = useBlock(block.id);

    const style: React.CSSProperties = {
        display: 'inline-block',
        width: '450px',
        verticalAlign: 'top',
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 50 : 1,
    };

    const meta = getBlockMeta(block.type);
    const Icon = meta.icon;
    const nodeName = block.type.toUpperCase();

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`nodrag bg-white dark:bg-zinc-900 transition-all duration-200 flex items-stretch border relative overflow-hidden ${isDragging
                ? 'shadow-2xl opacity-90 border-black dark:border-white z-50 scale-[1.02] cursor-grabbing'
                : 'shadow-sm border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600'
                }`}
        >
            <div className={`absolute top-0 left-0 bottom-0 w-1 ${meta.band}`} />
            
            <div
                {...attributes}
                {...listeners}
                className="w-8 ml-1 flex items-center justify-center cursor-grab active:cursor-grabbing text-zinc-300 dark:text-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-100 border-r border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 transition-colors"
                title="Drag"
            >
                <GripVertical size={14} />
            </div>

            <div className="flex-1 flex flex-col min-w-0">
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded shrink-0 flex items-center justify-center ${meta.bg} dark:bg-zinc-800/50 border ${meta.border} dark:border-zinc-700 ${meta.color}`}>
                            <Icon size={16} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100 tracking-[0.2em]">{nodeName}</span>
                            <span className="text-[9px] text-zinc-400 font-medium truncate max-w-[200px]">
                                {block.type === 'header' && block.data?.name}
                                {block.type === 'experience' && block.data?.company}
                                {block.type === 'education' && block.data?.school}
                                {block.type === 'project' && (block.data?.projectName || block.data?.title)}
                                {block.type === 'skills' && block.data?.category}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            remove();
                        }}
                        className="p-1 text-zinc-300 hover:text-red-600 transition-colors"
                        title="Delete"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>

                <div className="p-5">
                    <BlockRenderer block={block} />
                </div>
            </div>
        </div>
    );
});
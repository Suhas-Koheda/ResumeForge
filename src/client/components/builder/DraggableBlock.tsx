import React, { memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Briefcase, GraduationCap, Code, Rocket, Trash2, User } from 'lucide-react';
import { ResumeBlock } from '../@shared/types';
import { BlockRenderer } from './BlockRenderer';
import { useBlock } from '../../hooks/useResume';

interface DraggableBlockProps {
    block: ResumeBlock;
}

const getBlockMeta = (type: string) => {
    switch (type) {
        case 'experience': return { icon: Briefcase, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-200' };
        case 'education': return { icon: GraduationCap, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200' };
        case 'skills': return { icon: Code, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200' };
        case 'project': return { icon: Rocket, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-200' };
        case 'header': return { icon: User, color: 'text-zinc-500', bg: 'bg-zinc-50', border: 'border-zinc-200' };
        default: return { icon: Briefcase, color: 'text-zinc-500', bg: 'bg-zinc-50', border: 'border-zinc-200' };
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
        position: 'absolute',
        left: block.position.x,
        top: block.position.y,
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 50 : 1,
        width: '450px',
    };

    const meta = getBlockMeta(block.type);
    const Icon = meta.icon;
    const nodeName = block.type.toUpperCase();

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`bg-white dark:bg-zinc-900 transition-all duration-200 flex items-stretch border ${isDragging
                ? 'shadow-2xl opacity-90 border-black dark:border-white z-50 scale-[1.02] cursor-grabbing'
                : 'shadow-sm border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600'
                }`}
        >
            <div
                {...attributes}
                {...listeners}
                className="w-8 flex items-center justify-center cursor-grab active:cursor-grabbing text-zinc-300 dark:text-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-100 border-r border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 transition-colors"
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
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100 tracking-[0.2em]">{nodeName}</span>
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

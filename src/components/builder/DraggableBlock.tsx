import React, { memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Briefcase, GraduationCap, Code, Rocket, Trash2, User } from 'lucide-react';
import { ResumeBlock } from '../../types/block';
import { BlockRenderer } from './BlockRenderer';
import { useBlock } from '../../hooks/useResume';

interface DraggableBlockProps {
    block: ResumeBlock;
}

const getBlockMeta = (type: string) => {
    switch (type) {
        case 'experience': return { icon: Briefcase, color: 'text-orange-600', bg: 'bg-orange-100', borderColor: 'border-orange-200' };
        case 'education': return { icon: GraduationCap, color: 'text-blue-600', bg: 'bg-blue-100', borderColor: 'border-blue-200' };
        case 'skills': return { icon: Code, color: 'text-green-600', bg: 'bg-green-100', borderColor: 'border-green-200' };
        case 'project': return { icon: Rocket, color: 'text-purple-600', bg: 'bg-purple-100', borderColor: 'border-purple-200' };
        case 'header': return { icon: User, color: 'text-indigo-600', bg: 'bg-indigo-50', borderColor: 'border-indigo-100' };
        default: return { icon: Briefcase, color: 'text-gray-600', bg: 'bg-gray-100', borderColor: 'border-gray-200' };
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

    // Absolute positioning based on block state + current drag transform
    const style: React.CSSProperties = {
        position: 'absolute',
        left: block.position.x,
        top: block.position.y,
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 50 : 1,
        width: '400px',
    };

    const meta = getBlockMeta(block.type);
    const Icon = meta.icon;
    const nodeName = block.type.charAt(0).toUpperCase() + block.type.slice(1);

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`bg-white dark:bg-zinc-900 rounded-2xl transition-shadow duration-300 flex items-stretch border ${isDragging
                ? 'shadow-lift opacity-95 ring-2 ring-primary/20 cursor-grabbing border-primary'
                : 'shadow-soft border-border/80 hover:border-border'
                }`}
        >
            <div
                {...attributes}
                {...listeners}
                className="w-10 flex items-center justify-center cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground border-r border-border/50 bg-secondary/30 rounded-l-2xl transition-colors"
                title="Drag Node"
            >
                <GripVertical size={18} />
            </div>

            <div className="flex-1 flex flex-col min-w-0">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center border ${meta.bg} ${meta.color} ${meta.borderColor} shadow-sm`}>
                            <Icon size={20} />
                        </div>
                        <div className="flex flex-col text-left">
                            <span className="font-bold text-foreground text-sm tracking-tight">{nodeName} Node</span>
                        </div>
                    </div>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            remove();
                        }}
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                        title="Delete Node"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>

                <div className="p-6">
                    <BlockRenderer block={block} />
                </div>
            </div>
        </div>
    );
});

import React, { memo, useRef, useEffect } from 'react';
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
        case 'header':     return { icon: User,          accent: '#6366f1', label: 'Header' };
        case 'experience': return { icon: Briefcase,     accent: '#0ea5e9', label: 'Experience' };
        case 'education':  return { icon: GraduationCap, accent: '#10b981', label: 'Education' };
        case 'skills':     return { icon: Code,          accent: '#f59e0b', label: 'Skills' };
        case 'project':    return { icon: Rocket,        accent: '#ec4899', label: 'Project' };
        default:           return { icon: Briefcase,     accent: '#71717a', label: type };
    }
};

/** Small circle port (input left / output right) like n8n */
const Port: React.FC<{ side: 'left' | 'right'; accent: string }> = ({ side, accent }) => (
    <div
        style={{
            position: 'absolute',
            top: '50%',
            [side]: -8,
            transform: 'translateY(-50%)',
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: '#1e2028',
            border: `2px solid ${accent}`,
            boxShadow: `0 0 6px ${accent}55`,
            zIndex: 10,
        }}
    />
);

export const DraggableBlock: React.FC<DraggableBlockProps> = memo(({ block }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: block.id });
    const { remove } = useBlock(block.id);
    const meta = getBlockMeta(block.type);
    const Icon = meta.icon;

    // Attach a native (non-passive) wheel listener on the card body so that
    // scrolling inside the card scrolls its content instead of zooming the canvas.
    // React's synthetic onWheel won't work here because react-zoom-pan-pinch
    // registers its own native listener which fires before React's bubble phase.
    const bodyRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = bodyRef.current;
        if (!el) return;
        const stop = (e: WheelEvent) => e.stopPropagation();
        el.addEventListener('wheel', stop, { passive: false });
        return () => el.removeEventListener('wheel', stop);
    }, []);

    const subtitle =
        block.type === 'header'     ? block.data?.name :
        block.type === 'experience' ? block.data?.company :
        block.type === 'education'  ? block.data?.school :
        block.type === 'project'    ? (block.data?.projectName || block.data?.title) :
        block.type === 'skills'     ? block.data?.category : '';

    const wrapperStyle: React.CSSProperties = {
        position: 'absolute',
        left: block.position.x,
        top: block.position.y,
        width: 420,
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 1000 : 1,
        transition: isDragging ? 'none' : 'box-shadow 0.2s',
    };

    return (
        <div ref={setNodeRef} style={wrapperStyle} className="nodrag">
            {/* Input port */}
            <Port side="left" accent={meta.accent} />
            {/* Output port */}
            <Port side="right" accent={meta.accent} />

            <div
                className={`
                    bg-white dark:bg-[#1e2028]
                    ${
                        isDragging
                            ? `border-[${meta.accent}]`
                            : 'border-zinc-200 dark:border-[#2d3042]'
                    }
                `}
                style={{
                    borderRadius: 8,
                    border: isDragging
                        ? `1.5px solid ${meta.accent}`
                        : undefined,
                    boxShadow: isDragging
                        ? `0 0 24px ${meta.accent}44, 0 16px 40px rgba(0,0,0,0.3)`
                        : '0 2px 12px rgba(0,0,0,0.1)',
                    borderWidth: isDragging ? undefined : '1.5px',
                    borderStyle: 'solid',
                    overflow: 'hidden',
                    transform: isDragging ? 'scale(1.02)' : 'scale(1)',
                    transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s',
                }}
            >
                {/* ── Node header (n8n-style coloured bar) ─────────────── */}
                <div
                    {...attributes}
                    {...listeners}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 14px',
                        background: `linear-gradient(135deg, ${meta.accent}22, ${meta.accent}08)`,
                        borderBottom: `1px solid ${meta.accent}30`,
                        cursor: isDragging ? 'grabbing' : 'grab',
                        userSelect: 'none',
                    }}
                >
                    {/* Grip */}
                    <GripVertical size={13} className="text-zinc-400 dark:text-zinc-600" style={{ flexShrink: 0 }} />

                    {/* Icon badge */}
                    <div
                        style={{
                            width: 28,
                            height: 28,
                            borderRadius: 7,
                            background: `${meta.accent}22`,
                            border: `1px solid ${meta.accent}44`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <Icon size={14} style={{ color: meta.accent }} />
                    </div>

                    {/* Type + subtitle */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', color: meta.accent }}>
                            {meta.label}
                        </div>
                        {subtitle && (
                            <div style={{ fontSize: 9, color: '#6b7280', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {subtitle}
                            </div>
                        )}
                    </div>

                    {/* Delete */}
                    <button
                        className="nodrag"
                        onClick={(e) => { e.stopPropagation(); remove(); }}
                        style={{
                            padding: 4,
                            borderRadius: 4,
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            color: '#4b5563',
                            display: 'flex',
                            alignItems: 'center',
                            transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#4b5563')}
                        title="Delete node"
                    >
                        <Trash2 size={13} />
                    </button>
                </div>

                {/* ── Node body ─────────────────────────────────────────── */}
                <div
                    ref={bodyRef}
                    className={`nodrag node-body-${block.id}`}
                    style={{
                        padding: '14px 16px',
                        fontSize: 11,
                        maxHeight: '280px',
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        scrollbarWidth: 'thin',
                        scrollbarColor: `${meta.accent}55 transparent`,
                    }}
                >
                    <style>{`
                        .node-body-${block.id} { color: inherit; }
                        .node-body-${block.id}::-webkit-scrollbar { width: 4px; }
                        .node-body-${block.id}::-webkit-scrollbar-track { background: transparent; }
                        .node-body-${block.id}::-webkit-scrollbar-thumb { background: ${meta.accent}55; border-radius: 4px; }
                        .node-body-${block.id}::-webkit-scrollbar-thumb:hover { background: ${meta.accent}99; }
                    `}</style>
                    <BlockRenderer block={block} />
                </div>
            </div>
        </div>
    );
});
import React, { useRef, useCallback } from 'react';
import {
    DndContext,
    PointerSensor,
    KeyboardSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import { useResumeActions } from '../../hooks/useResume';
import { DraggableBlock } from './DraggableBlock';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Minus, Plus, Maximize2, LayoutGrid } from 'lucide-react';
import { ResumeBlock } from '@shared/types';

// Colour palette per block type (matches DraggableBlock node header)
const TYPE_ACCENT: Record<string, string> = {
    header:     '#6366f1',
    experience: '#0ea5e9',
    education:  '#10b981',
    project:    '#f59e0b',
    skills:     '#ec4899',
};

// Cluster column X origins (blocks of the same type stack in the same column)
const CLUSTER_COLUMNS: Record<string, number> = {
    header:     300,
    experience: 850,
    education:  1400,
    project:    1950,
    skills:     2500,
};
const NODE_WIDTH  = 420;
const NODE_VGAP   = 24;  // vertical gap between stacked nodes of same type
const NODE_HEIGHT = 220; // estimated node height for stacking

/** Draw SVG bezier connector lines between node clusters */
const ClusterConnectors: React.FC<{ groups: Record<string, ResumeBlock[]> }> = ({ groups }) => {
    const types = Object.keys(groups);
    if (types.length < 2) return null;

    const lines: React.ReactNode[] = [];
    for (let i = 0; i < types.length - 1; i++) {
        const fromType = types[i];
        const toType   = types[i + 1];
        const fromX = (CLUSTER_COLUMNS[fromType] ?? (300 + i * 550)) + NODE_WIDTH;
        const fromY = 2000 + 60; // approximate centre of first node header
        const toX   = CLUSTER_COLUMNS[toType] ?? (300 + (i + 1) * 550);
        const toY   = 2000 + 60;
        const cpX   = (fromX + toX) / 2;
        const accent = TYPE_ACCENT[fromType] ?? '#71717a';

        lines.push(
            <path
                key={`${fromType}-${toType}`}
                d={`M ${fromX} ${fromY} C ${cpX} ${fromY}, ${cpX} ${toY}, ${toX} ${toY}`}
                stroke={accent}
                strokeWidth="2"
                strokeDasharray="6 3"
                strokeOpacity="0.5"
                fill="none"
            />
        );
    }

    return (
        <svg
            style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                overflow: 'visible',
            }}
        >
            {lines}
        </svg>
    );
};

const CanvasRegistry: React.FC = () => {
    const { blocks, updateBlockPosition } = useResumeActions();
    const scaleRef = useRef(1);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
        useSensor(KeyboardSensor)
    );

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, delta } = event;
        const block = blocks.find((b: ResumeBlock) => b.id === active.id);
        if (block) {
            const s = scaleRef.current || 1;
            updateBlockPosition(active.id as string,
                block.position.x + delta.x / s,
                block.position.y + delta.y / s,
            );
        }
    }, [blocks, updateBlockPosition]);

    /**
     * Realign: snap every block back into its cluster column without removing data.
     * Groups by type, then stacks vertically within each column.
     */
    const handleRealign = useCallback(() => {
        const typeCounters: Record<string, number> = {};
        blocks.forEach((b: ResumeBlock) => {
            const idx = typeCounters[b.type] ?? 0;
            typeCounters[b.type] = idx + 1;
            const colX = CLUSTER_COLUMNS[b.type] ?? (300 + Object.keys(typeCounters).indexOf(b.type) * 550);
            updateBlockPosition(b.id, colX, idx * (NODE_HEIGHT + NODE_VGAP));
        });
    }, [blocks, updateBlockPosition]);

    // Group blocks by type
    const grouped: Record<string, ResumeBlock[]> = blocks.reduce(
        (acc: Record<string, ResumeBlock[]>, b: ResumeBlock) => {
            (acc[b.type] = acc[b.type] || []).push(b);
            return acc;
        }, {}
    );

    // Auto-position blocks that haven't been placed yet (position === 0,0)
    // They get stacked in their cluster column
    const typeCounters: Record<string, number> = {};
    const positionedBlocks = blocks.map((b: ResumeBlock) => {
        const isUnplaced = b.position.x === 0 && b.position.y === 0;
        if (!isUnplaced) return b;
        const idx = typeCounters[b.type] ?? 0;
        typeCounters[b.type] = idx + 1;
        const colX = CLUSTER_COLUMNS[b.type] ?? (300 + Object.keys(typeCounters).length * 550);
        return {
            ...b,
            position: {
                x: colX,
                y: idx * (NODE_HEIGHT + NODE_VGAP),
            },
        };
    });

    return (
        <div className="absolute inset-0 overflow-hidden outline-none bg-zinc-50 dark:bg-[#111215]">
            <style>{`
                :root { --dot-color: #e2e8f0; }
                .dark { --dot-color: #2a2d35; }
                .react-transform-component {
                    width: 100% !important;
                    height: 100% !important;
                }
            `}</style>

            <TransformWrapper
                initialScale={0.65}
                minScale={0.1}
                maxScale={2.5}
                centerOnInit={true}
                limitToBounds={false}
                panning={{ excluded: ['nodrag'] }}
                doubleClick={{ disabled: true }}
                onTransformed={(ref) => { scaleRef.current = ref.state.scale; }}
            >
                {({ zoomIn, zoomOut, resetTransform }) => (
                    <>
                        {/* ── Zoom Controls ─────────────────────────────────────── */}
                        <div className="absolute bottom-8 right-8 z-50 flex flex-col gap-1">
                            <div className="flex overflow-hidden rounded border border-zinc-200 dark:border-[#2d3042] bg-white dark:bg-[#1e2028]">
                                <button
                                    onClick={() => zoomIn()}
                                    className="p-3 transition-colors hover:bg-zinc-50 dark:hover:bg-white/5 border-r border-zinc-100 dark:border-[#2d3042]"
                                >
                                    <Plus size={14} className="text-zinc-500 dark:text-zinc-400" />
                                </button>
                                <button
                                    onClick={() => zoomOut()}
                                    className="p-3 transition-colors hover:bg-zinc-50 dark:hover:bg-white/5"
                                >
                                    <Minus size={14} className="text-zinc-500 dark:text-zinc-400" />
                                </button>
                            </div>
                            <button
                                onClick={() => resetTransform()}
                                className="p-3 rounded border border-zinc-200 dark:border-[#2d3042] bg-white dark:bg-[#1e2028] transition-colors hover:bg-zinc-50 dark:hover:bg-white/5 flex items-center justify-center"
                                title="Fit to screen"
                            >
                                <Maximize2 size={14} className="text-zinc-500 dark:text-zinc-400" />
                            </button>
                            {blocks.length > 0 && (
                                <button
                                    onClick={handleRealign}
                                    className="p-3 rounded border border-zinc-200 dark:border-[#2d3042] bg-white dark:bg-[#1e2028] transition-colors hover:bg-zinc-50 dark:hover:bg-white/5 flex items-center justify-center"
                                    title="Realign nodes to cluster columns"
                                >
                                    <LayoutGrid size={14} className="text-zinc-500 dark:text-zinc-400" />
                                </button>
                            )}
                        </div>

                        {/* ── Mini-legend ─────────────────────────────────────── */}
                        {blocks.length > 0 && (
                            <div className="absolute top-4 right-4 z-50 flex flex-col gap-1 p-3 rounded border border-zinc-200 dark:border-[#2d3042] bg-white dark:bg-[#1e2028] shadow-sm">
                                {Object.entries(grouped).map(([type, group]) => (
                                    <div key={type} className="flex items-center gap-2">
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: TYPE_ACCENT[type] ?? '#71717a' }} />
                                        <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400" style={{ letterSpacing: '0.12em' }}>
                                            {type} <span className="text-zinc-300 dark:text-zinc-600">×{group.length}</span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <TransformComponent wrapperClass="!w-full !h-full">
                            <div
                                style={{
                                    position: 'relative',
                                    width: '10000px',
                                    height: '10000px',
                                    backgroundImage: 'radial-gradient(circle, var(--dot-color) 1px, transparent 1px)',
                                    backgroundSize: '24px 24px',
                                }}
                            >
                                <DndContext
                                    sensors={sensors}
                                    onDragEnd={handleDragEnd}
                                >
                                    {/* Bezier connectors between cluster columns */}
                                    <ClusterConnectors groups={grouped} />

                                    {/* Absolute inset offset so nodes start near viewport centre */}
                                    <div style={{ position: 'absolute', top: 2000, left: 1000 }}>
                                        {blocks.length === 0 ? (
                                            <div
                                                style={{
                                                    position: 'fixed',
                                                    inset: 0,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    pointerEvents: 'none',
                                                }}
                                            >
                                                <div style={{ textAlign: 'center' }}>
                                                    <div className="w-px h-12 bg-zinc-200 dark:bg-[#2d3042] mx-auto mb-6" />
                                                    <h3 className="text-[10px] font-black text-zinc-700 dark:text-zinc-300 uppercase tracking-[0.3em] mb-3">
                                                        CANVAS EMPTY
                                                    </h3>
                                                    <p className="text-[9px] text-zinc-400 dark:text-zinc-600 tracking-[0.15em] leading-loose max-w-[200px]">
                                                        ADD BLOCKS FROM THE SIDEBAR TO START BUILDING
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            positionedBlocks.map((block: ResumeBlock) => (
                                                <DraggableBlock key={block.id} block={block} />
                                            ))
                                        )}
                                    </div>
                                </DndContext>
                            </div>
                        </TransformComponent>
                    </>
                )}
            </TransformWrapper>
        </div>
    );
};

export const ResumeCanvas = CanvasRegistry;

import React, { useRef } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import { useResumeActions } from '../../hooks/useResume';
import { DraggableBlock } from './DraggableBlock';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Minus, Plus, Maximize2 } from 'lucide-react';
import { ResumeBlock } from '@shared/types';

const CanvasRegistry: React.FC = () => {
    const { blocks, updateBlockPosition } = useResumeActions();
    const scaleRef = useRef(1);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor)
    );

    const [isDraggingNode, setIsDraggingNode] = React.useState(false);

    const handleDragStart = () => setIsDraggingNode(true);

    const handleDragEnd = (event: DragEndEvent) => {
        setIsDraggingNode(false);
        const { active, delta } = event;
        const block = blocks.find((b: ResumeBlock) => b.id === active.id);

        if (block) {
            const currentScale = scaleRef.current || 1;
            const newX = block.position.x + delta.x / currentScale;
            const newY = block.position.y + delta.y / currentScale;
            updateBlockPosition(active.id as string, newX, newY);
        }
    };

    // Group blocks by their type (e.g. "project", "experience", "skills")
    const grouped: Record<string, ResumeBlock[]> = blocks.reduce(
        (acc: Record<string, ResumeBlock[]>, b: ResumeBlock) => {
            (acc[b.type] = acc[b.type] || []).push(b);
            return acc;
        },
        {}
    );

    // Colour accent per type
    const typeColors: Record<string, string> = {
        header:     '#6366f1',
        experience: '#0ea5e9',
        education:  '#10b981',
        project:    '#f59e0b',
        skills:     '#ec4899',
    };

    return (
        <div className="absolute inset-0 overflow-hidden outline-none bg-zinc-50 dark:bg-zinc-950">
            <style>{`
                :root { --dot-color: #e2e8f0; }
                .dark { --dot-color: #1e293b; }
                .react-transform-component {
                    width: 100% !important;
                    height: 100% !important;
                }
            `}</style>

            <TransformWrapper
                initialScale={0.8}
                minScale={0.1}
                maxScale={2}
                centerOnInit={true}
                limitToBounds={false}
                panning={{ excluded: ['nodrag'] }}
                doubleClick={{ disabled: true }}
                onTransformed={(ref) => {
                    scaleRef.current = ref.state.scale;
                }}
            >
                {({ zoomIn, zoomOut, resetTransform }) => (
                    <>
                        <div className="absolute bottom-8 right-8 z-50 flex flex-col gap-1">
                            <div className="flex bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                                <button
                                    onClick={() => zoomIn()}
                                    className="p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors border-r border-zinc-100 dark:border-zinc-800"
                                >
                                    <Plus size={14} className="text-zinc-500" />
                                </button>
                                <button
                                    onClick={() => zoomOut()}
                                    className="p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                >
                                    <Minus size={14} className="text-zinc-500" />
                                </button>
                            </div>
                            <button
                                onClick={() => resetTransform()}
                                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all flex items-center justify-center"
                                title="Reset View"
                            >
                                <Maximize2 size={14} className="text-zinc-500" />
                            </button>
                        </div>

                        <TransformComponent wrapperClass="!w-full !h-full">
                            <div
                                className="relative min-w-[10000px] min-h-[10000px]"
                                style={{
                                    backgroundImage: 'radial-gradient(circle, var(--dot-color) 0.5px, transparent 0.5px)',
                                    backgroundSize: '40px 40px',
                                }}
                            >
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragStart={handleDragStart}
                                    onDragEnd={handleDragEnd}
                                >
                                    <div className="absolute inset-0 p-[2000px]">
                                        {blocks.length === 0 ? (
                                            <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
                                                <div className="text-center p-12 flex flex-col items-center max-w-sm">
                                                    <div className="w-px h-12 bg-zinc-200 dark:bg-zinc-800 mb-6"></div>
                                                    <h3 className="text-[10px] font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-[0.3em]">WORKSPACE EMPTY</h3>
                                                    <p className="text-[9px] text-zinc-400 dark:text-zinc-600 mt-4 tracking-[0.15em] leading-loose max-w-[200px]">
                                                        SELECT COMPONENTS FROM THE LATERAL BAR TO BEGIN ARCHITECTING YOUR RESUME
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            // ── Clustered view: one section per block type ──────────────────
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                                                {Object.entries(grouped).map(([type, group]) => {
                                                    const accent = typeColors[type] ?? '#71717a';
                                                    return (
                                                        <div key={type}>
                                                            {/* Cluster label */}
                                                            <div style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '8px',
                                                                marginBottom: '12px',
                                                            }}>
                                                                <div style={{
                                                                    width: '3px',
                                                                    height: '16px',
                                                                    borderRadius: '2px',
                                                                    backgroundColor: accent,
                                                                }} />
                                                                <span style={{
                                                                    fontSize: '10px',
                                                                    fontWeight: 900,
                                                                    textTransform: 'uppercase',
                                                                    letterSpacing: '0.25em',
                                                                    color: accent,
                                                                }}>
                                                                    {type}
                                                                    <span style={{ color: '#a1a1aa', marginLeft: '6px', fontWeight: 400 }}>
                                                                        ×{group.length}
                                                                    </span>
                                                                </span>
                                                                <div style={{ flex: 1, height: '1px', backgroundColor: '#e4e4e7' }} />
                                                            </div>

                                                            {/* Cluster cards – flex-wrap so they sit side-by-side */}
                                                            <div style={{
                                                                display: 'flex',
                                                                flexWrap: 'wrap',
                                                                gap: '16px',
                                                            }}>
                                                                {group.map((block: ResumeBlock) => (
                                                                    <DraggableBlock key={block.id} block={block} />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            // ────────────────────────────────────────────────────────────────
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

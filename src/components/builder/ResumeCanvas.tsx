import React from 'react';
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
import { ZoomIn, ZoomOut, Maximize, MousePointer2 } from 'lucide-react';

export const ResumeCanvas: React.FC = () => {
    const { blocks, updateBlockPosition } = useResumeActions();

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor)
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, delta } = event;
        const block = blocks.find((b) => b.id === active.id);

        if (block) {
            const newX = block.position.x + delta.x;
            const newY = block.position.y + delta.y;
            updateBlockPosition(active.id as string, newX, newY);
        }
    };

    return (
        <div className="absolute inset-0 overflow-hidden outline-none bg-[#fafafa] dark:bg-zinc-950">
            <style>{`
        :root { --dot-color: #cbd5e1; }
        .dark { --dot-color: #334155; }
        .react-transform-component {
          width: 100% !important;
          height: 100% !important;
        }
      `}</style>

            <TransformWrapper
                initialScale={1}
                minScale={0.2}
                maxScale={2}
                centerOnInit={false}
                limitToBounds={false}
                panning={{ activationKeys: [], disabled: false }}
                doubleClick={{ disabled: true }}
            >
                {({ zoomIn, zoomOut, resetTransform }) => (
                    <>
                        {/* Floating Zoom Controls */}
                        <div className="absolute bottom-6 right-6 z-50 flex items-center gap-2 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-border p-1.5 rounded-2xl shadow-lift animate-in slide-in-from-bottom-4">
                            <button
                                onClick={() => zoomIn()}
                                className="p-2.5 hover:bg-secondary dark:hover:bg-zinc-800 rounded-xl transition-all text-muted-foreground hover:text-primary active:scale-90"
                                title="Zoom In"
                            >
                                <ZoomIn size={18} />
                            </button>
                            <div className="w-px h-4 bg-border/50"></div>
                            <button
                                onClick={() => zoomOut()}
                                className="p-2.5 hover:bg-secondary dark:hover:bg-zinc-800 rounded-xl transition-all text-muted-foreground hover:text-primary active:scale-90"
                                title="Zoom Out"
                            >
                                <ZoomOut size={18} />
                            </button>
                            <div className="w-px h-4 bg-border/50"></div>
                            <button
                                onClick={() => resetTransform()}
                                className="p-2.5 hover:bg-secondary dark:hover:bg-zinc-800 rounded-xl transition-all text-muted-foreground hover:text-primary active:scale-90"
                                title="Reset View"
                            >
                                <Maximize size={18} />
                            </button>
                            <div className="w-px h-4 bg-border/50 ml-1"></div>
                            <div className="px-3 flex items-center gap-2">
                                <MousePointer2 size={14} className="text-primary/50" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Space + Drag to Pan</span>
                            </div>
                        </div>

                        <TransformComponent wrapperClass="!w-full !h-full">
                            <div
                                className="relative min-w-[5000px] min-h-[5000px]"
                                style={{
                                    backgroundImage: 'radial-gradient(circle, var(--dot-color) 1px, transparent 1px)',
                                    backgroundSize: '32px 32px',
                                }}
                            >
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleDragEnd}
                                >
                                    <div className="absolute inset-0 p-[1000px]">
                                        {blocks.length === 0 ? (
                                            <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
                                                <div className="text-center bg-white dark:bg-zinc-900 border border-border rounded-2xl p-12 shadow-soft flex flex-col items-center max-w-sm animate-in pointer-events-auto">
                                                    <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mb-4">
                                                        <div className="w-8 h-8 bg-indigo-200/50 dark:bg-indigo-400/20 rounded-md border border-indigo-300 dark:border-indigo-500/50"></div>
                                                    </div>
                                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Empty Workspace</h3>
                                                    <p className="text-sm text-gray-500 dark:text-zinc-400 mt-2 text-center">Add nodes from the sidebar to visualize your resume.</p>
                                                </div>
                                            </div>
                                        ) : (
                                            blocks.map((block) => (
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

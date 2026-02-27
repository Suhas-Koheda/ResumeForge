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
        <div
            className="absolute inset-0 overflow-auto outline-none"
            style={{
                backgroundImage: 'radial-gradient(circle, var(--dot-color) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
            }}
        >
            <style>{`
        :root { --dot-color: #cbd5e1; }
        .dark { --dot-color: #334155; }
      `}</style>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <div className="relative min-w-[3000px] min-h-[3000px] p-24">
                    {blocks.length === 0 ? (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center bg-white dark:bg-zinc-900 border border-border rounded-2xl p-12 shadow-soft flex flex-col items-center max-w-sm animate-in pointer-events-auto">
                                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                                    <div className="w-8 h-8 bg-blue-200/50 rounded-md border border-blue-300"></div>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Canvas is empty</h3>
                                <p className="text-sm text-gray-500 mt-2 text-center">Select a node from the left panel to begin building.</p>
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
    );
};

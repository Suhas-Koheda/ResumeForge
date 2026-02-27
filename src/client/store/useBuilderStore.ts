import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ResumeBlock, BlockType } from '@shared/types';

interface BuilderStore {
    blocks: ResumeBlock[];
    addBlock: (type: BlockType) => void;
    updateBlock: (id: string, data: any) => void;
    deleteBlock: (id: string) => void;
    updateBlockPosition: (id: string, x: number, y: number) => void;
    apiKey: string;
    setApiKey: (key: string) => void;
    customTemplate: string;
    setCustomTemplate: (template: string) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export const useBuilderStore = create<BuilderStore>()(
    persist(
        (set) => ({
            blocks: [
                {
                    id: 'initial-exp',
                    type: 'experience',
                    position: { x: 50, y: 50 },
                    data: { company: 'Tech Corp', role: 'Software Engineer', duration: '2020 - Present' }
                }
            ],
            apiKey: '',
            customTemplate: '',

            addBlock: (type) => {
                const id = generateId();
                set((state) => {
                    const lastBlock = state.blocks[state.blocks.length - 1];
                    const newX = lastBlock ? lastBlock.position.x + 40 : 100;
                    const newY = lastBlock ? lastBlock.position.y + 40 : 100;

                    const newBlock: ResumeBlock = {
                        id,
                        type,
                        position: { x: newX, y: newY },
                        data: {},
                    };
                    return { blocks: [...state.blocks, newBlock] };
                });
                return id;
            },

            updateBlock: (id, partialData) =>
                set((state) => ({
                    blocks: state.blocks.map((block) =>
                        block.id === id ? { ...block, data: { ...block.data, ...partialData } } : block
                    ),
                })),

            deleteBlock: (id) =>
                set((state) => ({
                    blocks: state.blocks.filter((block) => block.id !== id),
                })),

            updateBlockPosition: (id, x, y) =>
                set((state) => ({
                    blocks: state.blocks.map((block) =>
                        block.id === id ? { ...block, position: { x, y } } : block
                    ),
                })),

            setApiKey: (apiKey) => set({ apiKey }),
            setCustomTemplate: (customTemplate) => set({ customTemplate }),
        }),
        {
            name: 'resume-builder-storage',
        }
    )
);

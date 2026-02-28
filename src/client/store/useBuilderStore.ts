import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ResumeBlock, BlockType } from '@shared/types';

interface ResumeStorage {
    blocks: ResumeBlock[];
    fullLatex: string | null;
}

interface BuilderStore {
    resumes: ResumeStorage[];
    activeResumeIndex: number;
    blocks: ResumeBlock[];
    fullLatex: string | null;
    addBlock: (type: BlockType) => string;
    updateBlock: (id: string, data: any) => void;
    deleteBlock: (id: string) => void;
    updateBlockPosition: (id: string, x: number, y: number) => void;
    setBlocks: (blocks: ResumeBlock[]) => void;
    setFullLatex: (latex: string | null) => void;
    switchResume: (index: number) => void;
    apiKey: string;
    setApiKey: (key: string) => void;
    customTemplate: string;
    setCustomTemplate: (template: string) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const INITIAL_BLOCKS = [
    {
        id: 'initial-exp',
        type: 'experience' as BlockType,
        position: { x: 100, y: 100 },
        data: { company: 'Tech Corp', role: 'Software Engineer', duration: '2020 - Present' }
    }
];

export const useBuilderStore = create<BuilderStore>()(
    persist(
        (set, get) => ({
            resumes: [
                { blocks: INITIAL_BLOCKS, fullLatex: null },
                { blocks: [], fullLatex: null }
            ],
            activeResumeIndex: 0,
            blocks: INITIAL_BLOCKS,
            fullLatex: null,
            apiKey: '',
            customTemplate: '',

            setBlocks: (blocks) => set({ blocks }),
            setFullLatex: (fullLatex) => set({ fullLatex }),

            switchResume: (index) => {
                const state = get();
                // Save current to index
                const newResumes = [...state.resumes];
                newResumes[state.activeResumeIndex] = { blocks: state.blocks, fullLatex: state.fullLatex };
                
                // Load new from index
                const target = newResumes[index] || { blocks: [], fullLatex: null };
                set({
                    activeResumeIndex: index,
                    blocks: target.blocks,
                    fullLatex: target.fullLatex,
                    resumes: newResumes
                });
            },

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
            name: 'resume-builder-storage-v2',
        }
    )
);

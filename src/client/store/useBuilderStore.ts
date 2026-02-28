import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ResumeBlock, BlockType } from '@shared/types';

interface ResumeStorage {
    id?: string;
    blocks: ResumeBlock[];
    fullLatex: string | null;
}

interface BuilderStore {
    resumes: ResumeStorage[];
    activeResumeIndex: number;
    blocks: ResumeBlock[];
    fullLatex: string | null;
    setResumeId: (index: number, id: string) => void;
    addBlock: (type: BlockType) => string;
    updateBlock: (id: string, data: any) => void;
    deleteBlock: (id: string) => void;
    toggleBlock: (id: string) => void;
    updateBlockPosition: (id: string, x: number, y: number) => void;
    setBlocks: (blocks: ResumeBlock[]) => void;
    setFullLatex: (latex: string | null) => void;
    switchResume: (index: number) => void;
    addResume: () => void;
    deleteResume: (index: number) => void;
    apiKey: string;
    setApiKey: (key: string) => void;
    customTemplate: string;
    setCustomTemplate: (template: string) => void;
    token: string | null;
    setToken: (token: string | null) => void;
    logout: () => void;
    viewState: 'landing' | 'auth' | 'canvas';
    setViewState: (viewState: 'landing' | 'auth' | 'canvas') => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const INITIAL_BLOCKS: ResumeBlock[] = [];

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
            token: null,
            viewState: 'landing',

            setToken: (token) => set({ token, viewState: token ? 'canvas' : 'landing' }),
            logout: () => set({ token: null, viewState: 'landing' }),
            setViewState: (viewState) => set({ viewState }),

            setResumeId: (index, id) => set((state) => {
                const newResumes = [...state.resumes];
                if (newResumes[index]) {
                    newResumes[index] = { ...newResumes[index], id };
                }
                return { resumes: newResumes };
            }),

            setBlocks: (blocks) => set((state) => {
                const newResumes = [...state.resumes];
                newResumes[state.activeResumeIndex] = {
                    ...newResumes[state.activeResumeIndex],
                    blocks
                };
                return { blocks, resumes: newResumes };
            }),
            setFullLatex: (fullLatex) => set((state) => {
                const newResumes = [...state.resumes];
                newResumes[state.activeResumeIndex] = {
                    ...newResumes[state.activeResumeIndex],
                    fullLatex
                };
                return { fullLatex, resumes: newResumes };
            }),

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

            addResume: () => {
                const state = get();
                const newResumes = [...state.resumes];
                newResumes[state.activeResumeIndex] = { blocks: state.blocks, fullLatex: state.fullLatex };
                newResumes.push({ blocks: [], fullLatex: null });

                const newIndex = newResumes.length - 1;
                set({
                    resumes: newResumes,
                    activeResumeIndex: newIndex,
                    blocks: [],
                    fullLatex: null
                });
            },

            deleteResume: (index) => {
                const state = get();
                if (state.resumes.length <= 1) return; // always keep at least one
                const newResumes = state.resumes.filter((_, i) => i !== index);
                const newIndex = Math.min(index, newResumes.length - 1);
                const target = newResumes[newIndex];
                set({
                    resumes: newResumes,
                    activeResumeIndex: newIndex,
                    blocks: target.blocks,
                    fullLatex: target.fullLatex,
                });
            },

            addBlock: (type) => {
                const id = generateId();
                set((state) => {
                    const blocksOfType = state.blocks.filter(b => b.type === type);
                    const BASE_X: Record<string, number> = {
                        header: 0,
                        summary: 500,
                        experience: 1000,
                        education: 1500,
                        project: 2000,
                        skills: 2500,
                        other: 3000,
                    };

                    const startX = BASE_X[type as keyof typeof BASE_X] ?? 0;
                    const startY = 0;
                    let newX = startX;
                    let newY = startY;

                    if (blocksOfType.length > 0) {
                        const lastBlock = blocksOfType[blocksOfType.length - 1];
                        newX = lastBlock.position.x;
                        newY = lastBlock.position.y + 200;
                    }

                    const newBlock: ResumeBlock = { id, type, position: { x: newX, y: newY }, data: {}, enabled: true };
                    const newBlocks = [...state.blocks, newBlock];

                    const newResumes = [...state.resumes];
                    newResumes[state.activeResumeIndex] = { ...newResumes[state.activeResumeIndex], blocks: newBlocks };

                    return { blocks: newBlocks, resumes: newResumes };
                });
                return id;
            },

            updateBlock: (id, partialData) =>
                set((state) => {
                    const newBlocks = state.blocks.map((block) =>
                        block.id === id ? { ...block, data: { ...block.data, ...partialData } } : block
                    );
                    const newResumes = [...state.resumes];
                    newResumes[state.activeResumeIndex] = { ...newResumes[state.activeResumeIndex], blocks: newBlocks };
                    return { blocks: newBlocks, resumes: newResumes };
                }),

            deleteBlock: (id) =>
                set((state) => {
                    const newBlocks = state.blocks.filter((block) => block.id !== id);
                    const newResumes = [...state.resumes];
                    newResumes[state.activeResumeIndex] = { ...newResumes[state.activeResumeIndex], blocks: newBlocks };
                    return { blocks: newBlocks, resumes: newResumes };
                }),

            toggleBlock: (id) =>
                set((state) => {
                    const newBlocks = state.blocks.map((block) =>
                        block.id === id ? { ...block, enabled: block.enabled === false ? true : false } : block
                    );
                    const newResumes = [...state.resumes];
                    newResumes[state.activeResumeIndex] = { ...newResumes[state.activeResumeIndex], blocks: newBlocks };
                    return { blocks: newBlocks, resumes: newResumes };
                }),

            updateBlockPosition: (id, x, y) =>
                set((state) => {
                    const newBlocks = state.blocks.map((block) =>
                        block.id === id ? { ...block, position: { x, y } } : block
                    );
                    const newResumes = [...state.resumes];
                    newResumes[state.activeResumeIndex] = { ...newResumes[state.activeResumeIndex], blocks: newBlocks };
                    return { blocks: newBlocks, resumes: newResumes };
                }),

            setApiKey: (apiKey) => set({ apiKey }),
            setCustomTemplate: (customTemplate) => set({ customTemplate }),
        }),
        {
            name: 'resume-builder-storage-v3',
        }
    )
);

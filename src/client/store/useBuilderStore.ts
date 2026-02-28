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
                        header: 100,
                        experience: 600,
                        education: 1100,
                        project: 1600,
                        skills: 2100,
                    };
                    
                    const startX = BASE_X[type as keyof typeof BASE_X] || 100;
                    const startY = 100;

                    let newX = startX;
                    let newY = startY;

                    if (blocksOfType.length > 0) {
                        const lastBlock = blocksOfType[blocksOfType.length - 1];
                        newX = lastBlock.position.x;
                        newY = lastBlock.position.y + 400; // offset by rough typical block height
                    } else if (state.blocks.length > 0 && !BASE_X[type]) {
                        // Fallback if type not recognized, append to general end
                        const lastBlock = state.blocks[state.blocks.length - 1];
                        newX = lastBlock.position.x;
                        newY = lastBlock.position.y + 400;
                    }

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
            name: 'resume-builder-storage-v3',
        }
    )
);

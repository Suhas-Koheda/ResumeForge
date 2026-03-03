import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ResumeBlock, BlockType } from '@shared/types';

import { LatexGenerationOptions } from '../../shared/template.types';

interface LatexFile {
    name: string;
    content: string;
}

interface ResumeStorage {
    id?: string;
    title?: string;
    blocks: ResumeBlock[];
    projectFiles: LatexFile[];
    activeFileName: string | null;
    templateOptions?: LatexGenerationOptions;
}

interface BuilderStore {
    resumes: ResumeStorage[];
    activeResumeIndex: number;
    blocks: ResumeBlock[];
    projectFiles: LatexFile[];
    activeFileName: string | null;
    customTemplate: string;
    templateOptions: LatexGenerationOptions;
    setResumeId: (index: number, id: string) => void;
    addBlock: (type: BlockType) => string;
    updateBlock: (id: string, data: any) => void;
    deleteBlock: (id: string) => void;
    toggleBlock: (id: string) => void;
    updateBlockPosition: (id: string, x: number, y: number) => void;
    setBlocks: (blocks: ResumeBlock[]) => void;
    setProjectFiles: (files: LatexFile[]) => void;
    updateFileContent: (name: string, content: string) => void;
    setActiveFileName: (name: string | null) => void;
    addFile: (name: string) => void;
    deleteFile: (name: string) => void;
    setTemplateOptions: (options: Partial<LatexGenerationOptions>) => void;
    switchResume: (index: number) => void;
    addResume: (data?: Partial<ResumeStorage>) => void;
    deleteResume: (index: number) => void;
    apiKey: string;
    setApiKey: (key: string) => void;
    setCustomTemplate: (template: string) => void;
    token: string | null;
    userEmail: string | null;
    isVerified: boolean;
    setToken: (token: string | null, email?: string, isVerified?: boolean) => void;
    setIsVerified: (isVerified: boolean) => void;
    logout: () => void;
    viewState: 'landing' | 'auth' | 'canvas' | 'verify';
    setViewState: (viewState: 'landing' | 'auth' | 'canvas' | 'verify') => void;
    loadResumes: (resumes: any[]) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const INITIAL_BLOCKS: ResumeBlock[] = [];

const DEFAULT_TEMPLATE_OPTIONS: LatexGenerationOptions = {
    template: 'modern',
    fontSize: 11,
    paperSize: 'a4',
    colorScheme: {
        primary: '#2563eb',
        secondary: '#4b5563',
        accent: '#3b82f6'
    },
    fontFamily: 'sans',
    showIcons: true,
    sectionStyle: 'lined'
};

export const useBuilderStore = create<BuilderStore>()(
    persist(
        (set, get) => ({
            resumes: [
                { blocks: INITIAL_BLOCKS, projectFiles: [{ name: 'main.tex', content: '' }], activeFileName: 'main.tex', templateOptions: DEFAULT_TEMPLATE_OPTIONS }
            ],
            activeResumeIndex: 0,
            blocks: INITIAL_BLOCKS,
            projectFiles: [{ name: 'main.tex', content: '' }],
            activeFileName: 'main.tex',
            apiKey: '',
            customTemplate: '',
            templateOptions: DEFAULT_TEMPLATE_OPTIONS,
            token: null,
            userEmail: null,
            isVerified: false,
            viewState: 'landing',

            setToken: (token, email, isVerified) => set({
                token,
                userEmail: email || (token === 'local-bypass' ? 'local-host@dev.local' : null),
                isVerified: isVerified ?? (token === 'local-bypass'),
                viewState: token ? 'canvas' : 'landing'
            }),
            setIsVerified: (isVerified) => set({ isVerified }),
            logout: () => {
                set({
                    token: null,
                    userEmail: null,
                    isVerified: false,
                    viewState: 'landing',
                    resumes: [{ blocks: INITIAL_BLOCKS, projectFiles: [{ name: 'main.tex', content: '' }], activeFileName: 'main.tex' }],
                    activeResumeIndex: 0,
                    blocks: INITIAL_BLOCKS,
                    projectFiles: [{ name: 'main.tex', content: '' }],
                    activeFileName: 'main.tex'
                });
                localStorage.removeItem('resume-builder-storage-v5');
            },
            setViewState: (viewState) => set({ viewState }),

            loadResumes: (backendResumes) => {
                const state = get();
                const formattedResumes: ResumeStorage[] = backendResumes.map(r => ({
                    id: r.id,
                    title: r.title,
                    blocks: r.canvasData?.nodes || [],
                    projectFiles: r.canvasData?.projectFiles || (r.canvasData?.fullLatex ? [{ name: 'main.tex', content: r.canvasData.fullLatex }] : [{ name: 'main.tex', content: '' }]),
                    activeFileName: r.canvasData?.activeFileName || 'main.tex'
                }));

                if (formattedResumes.length > 0) {
                    // Try to preserve active index if possible, otherwise default to 0
                    const newIndex = state.activeResumeIndex < formattedResumes.length
                        ? state.activeResumeIndex
                        : 0;

                    set({
                        resumes: formattedResumes,
                        activeResumeIndex: newIndex,
                        blocks: formattedResumes[newIndex].blocks,
                        projectFiles: formattedResumes[newIndex].projectFiles,
                        activeFileName: formattedResumes[newIndex].activeFileName,
                        templateOptions: formattedResumes[newIndex].templateOptions || DEFAULT_TEMPLATE_OPTIONS
                    });
                }
            },

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
            setProjectFiles: (projectFiles) => set((state) => {
                const newResumes = [...state.resumes];
                newResumes[state.activeResumeIndex] = {
                    ...newResumes[state.activeResumeIndex],
                    projectFiles
                };
                return { projectFiles, resumes: newResumes };
            }),
            updateFileContent: (name, content) => set((state) => {
                const projectFiles = state.projectFiles.map(f => f.name === name ? { ...f, content } : f);
                const newResumes = [...state.resumes];
                newResumes[state.activeResumeIndex] = {
                    ...newResumes[state.activeResumeIndex],
                    projectFiles
                };
                return { projectFiles, resumes: newResumes };
            }),
            setActiveFileName: (activeFileName) => set((state) => {
                const newResumes = [...state.resumes];
                newResumes[state.activeResumeIndex] = {
                    ...newResumes[state.activeResumeIndex],
                    activeFileName
                };
                return { activeFileName, resumes: newResumes };
            }),
            addFile: (name) => set((state) => {
                if (state.projectFiles.some(f => f.name === name)) return state;
                const projectFiles = [...state.projectFiles, { name, content: '' }];
                const newResumes = [...state.resumes];
                newResumes[state.activeResumeIndex] = { ...newResumes[state.activeResumeIndex], projectFiles };
                return { projectFiles, resumes: newResumes, activeFileName: name };
            }),
            deleteFile: (name) => set((state) => {
                const projectFiles = state.projectFiles.filter(f => f.name !== name);
                const activeFileName = state.activeFileName === name ? (projectFiles[0]?.name || null) : state.activeFileName;
                const newResumes = [...state.resumes];
                newResumes[state.activeResumeIndex] = { ...newResumes[state.activeResumeIndex], projectFiles, activeFileName };
                return { projectFiles, resumes: newResumes, activeFileName };
            }),

            setTemplateOptions: (options) => set((state) => {
                const newOptions = { ...state.templateOptions, ...options };
                const newResumes = [...state.resumes];
                newResumes[state.activeResumeIndex] = {
                    ...newResumes[state.activeResumeIndex],
                    templateOptions: newOptions
                };
                return { templateOptions: newOptions, resumes: newResumes };
            }),

            switchResume: (index) => {
                const state = get();
                // Save current to index
                const newResumes = [...state.resumes];
                newResumes[state.activeResumeIndex] = {
                    ...newResumes[state.activeResumeIndex],
                    blocks: state.blocks,
                    projectFiles: state.projectFiles,
                    activeFileName: state.activeFileName,
                    templateOptions: state.templateOptions
                };

                // Load new from index
                const target = newResumes[index];
                if (!target) return;

                set({
                    activeResumeIndex: index,
                    blocks: target.blocks,
                    projectFiles: target.projectFiles || [{ name: 'main.tex', content: '' }],
                    activeFileName: target.activeFileName || 'main.tex',
                    templateOptions: target.templateOptions || DEFAULT_TEMPLATE_OPTIONS,
                    resumes: newResumes
                });
            },

            addResume: (data) => {
                const state = get();
                const newResumes = [...state.resumes];

                // Save current state to current active index first
                newResumes[state.activeResumeIndex] = {
                    ...newResumes[state.activeResumeIndex],
                    blocks: state.blocks,
                    projectFiles: state.projectFiles,
                    activeFileName: state.activeFileName,
                    templateOptions: state.templateOptions
                };

                // Create new resume entry
                const newResume: ResumeStorage = {
                    id: data?.id,
                    title: data?.title || `Resume R_${newResumes.length + 1}`,
                    blocks: data?.blocks || [],
                    projectFiles: data?.projectFiles || [{ name: 'main.tex', content: '' }],
                    activeFileName: data?.activeFileName || 'main.tex'
                };
                newResumes.push(newResume);

                const newIndex = newResumes.length - 1;
                set({
                    resumes: newResumes,
                    activeResumeIndex: newIndex,
                    blocks: newResume.blocks,
                    projectFiles: newResume.projectFiles || [{ name: 'main.tex', content: '' }],
                    activeFileName: newResume.activeFileName || 'main.tex',
                    templateOptions: newResume.templateOptions || DEFAULT_TEMPLATE_OPTIONS
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
                    projectFiles: target.projectFiles || [{ name: 'main.tex', content: '' }],
                    activeFileName: target.activeFileName || 'main.tex',
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
            name: 'resume-builder-storage-v5',
        }
    )
);

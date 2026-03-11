import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ResumeBlock, BlockType } from '@shared/types';
import { LatexGenerationOptions } from '../../shared/template.types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LatexFile {
    name: string;
    content: string;
    version: number;
    lastEditor: 'canvas' | 'code' | 'system';
    timestamp: number;
}

export interface ResumeStorage {
    id?: string;
    title?: string;
    blocks: ResumeBlock[];
    projectFiles: LatexFile[];
    activeFileName: string | null;
    templateOptions?: LatexGenerationOptions;
}

interface BuilderStore {
    // Multi-resume management
    resumes: ResumeStorage[];
    activeResumeIndex: number;

    // Active resume state (mirrors the active entry in `resumes`)
    blocks: ResumeBlock[];
    projectFiles: LatexFile[];
    activeFileName: string | null;
    customTemplate: string;
    templateOptions: LatexGenerationOptions;
    apiKey: string;
    // Auth state
    token: string | null;
    userEmail: string | null;

    // Block actions
    addBlock: (type: BlockType) => string;
    updateBlock: (id: string, data: any) => void;
    deleteBlock: (id: string) => void;
    toggleBlock: (id: string) => void;
    updateBlockPosition: (id: string, x: number, y: number) => void;
    setBlocks: (blocks: ResumeBlock[]) => void;

    // File actions
    setProjectFiles: (files: LatexFile[]) => void;
    updateFileContent: (name: string, content: string, source?: 'canvas' | 'code' | 'system') => void;
    setActiveFileName: (name: string | null) => void;
    addFile: (name: string) => void;
    deleteFile: (name: string) => void;

    // Template actions
    setCustomTemplate: (template: string) => void;
    setTemplateOptions: (options: Partial<LatexGenerationOptions>) => void;
    setApiKey: (key: string) => void;

    // Auth actions
    setToken: (token: string | null, email: string | null) => void;

    // Resume management
    switchResume: (index: number) => void;
    addResume: (data?: Partial<ResumeStorage>) => void;
    deleteResume: (index: number) => void;
    setResumeId: (index: number, id: string) => void;
    loadResumes: (resumes: any[]) => void;
    resetCanvas: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const generateId = (): string => Math.random().toString(36).substring(2, 9);

const DEFAULT_PROJECT_FILES: LatexFile[] = [{ 
    name: 'main.tex', 
    content: '',
    version: 1,
    lastEditor: 'system',
    timestamp: Date.now()
}];

const DEFAULT_TEMPLATE_OPTIONS: LatexGenerationOptions = {
    template: 'modern',
    fontSize: 11,
    paperSize: 'a4',
    colorScheme: { primary: '#2563eb', secondary: '#4b5563', accent: '#3b82f6' },
    fontFamily: 'sans',
    showIcons: true,
    sectionStyle: 'lined',
};

const EMPTY_RESUME = (): ResumeStorage => ({
    blocks: [],
    projectFiles: [...DEFAULT_PROJECT_FILES],
    activeFileName: 'main.tex',
    templateOptions: DEFAULT_TEMPLATE_OPTIONS,
});

// ── Block position layout ─────────────────────────────────────────────────────

const BASE_X_FOR_TYPE: Record<string, number> = {
    header: 0,
    summary: 500,
    experience: 1000,
    education: 1500,
    project: 2000,
    skills: 2500,
    other: 3000,
};

// ── Store ─────────────────────────────────────────────────────────────────────

export const useBuilderStore = create<BuilderStore>()(
    persist(
        (set, get) => ({
            resumes: [EMPTY_RESUME()],
            activeResumeIndex: 0,
            blocks: [],
            projectFiles: [...DEFAULT_PROJECT_FILES],
            activeFileName: 'main.tex',
            customTemplate: '',
            templateOptions: { ...DEFAULT_TEMPLATE_OPTIONS },
            apiKey: '',
            token: null,
            userEmail: null,

            // ── Auth actions ──────────────────────────────────────────────────

            setToken: (token, userEmail) => set({ token, userEmail }),

            // ── Block actions ─────────────────────────────────────────────────

            addBlock: (type) => {
                const id = generateId();
                set((state) => {
                    const blocksOfType = state.blocks.filter(b => b.type === type);
                    const startX = BASE_X_FOR_TYPE[type as keyof typeof BASE_X_FOR_TYPE] ?? 0;

                    const newX = blocksOfType.length > 0
                        ? blocksOfType[blocksOfType.length - 1].position.x
                        : startX;
                    const newY = blocksOfType.length > 0
                        ? blocksOfType[blocksOfType.length - 1].position.y + 200
                        : 0;

                    const newBlock: ResumeBlock = {
                        id, type, position: { x: newX, y: newY }, data: {}, enabled: true,
                    };
                    const newBlocks = [...state.blocks, newBlock];
                    const resumes = syncActiveResume(state, { blocks: newBlocks });
                    return { blocks: newBlocks, resumes };
                });
                return id;
            },

            updateBlock: (id, partialData) =>
                set((state) => {
                    const newBlocks = state.blocks.map(b =>
                        b.id === id ? { ...b, data: { ...b.data, ...partialData } } : b,
                    );
                    return { blocks: newBlocks, resumes: syncActiveResume(state, { blocks: newBlocks }) };
                }),

            deleteBlock: (id) =>
                set((state) => {
                    const newBlocks = state.blocks.filter(b => b.id !== id);
                    return { blocks: newBlocks, resumes: syncActiveResume(state, { blocks: newBlocks }) };
                }),

            toggleBlock: (id) =>
                set((state) => {
                    const newBlocks = state.blocks.map(b =>
                        b.id === id ? { ...b, enabled: b.enabled === false } : b,
                    );
                    return { blocks: newBlocks, resumes: syncActiveResume(state, { blocks: newBlocks }) };
                }),

            updateBlockPosition: (id, x, y) =>
                set((state) => {
                    const newBlocks = state.blocks.map(b =>
                        b.id === id ? { ...b, position: { x, y } } : b,
                    );
                    return { blocks: newBlocks, resumes: syncActiveResume(state, { blocks: newBlocks }) };
                }),

            setBlocks: (blocks) =>
                set((state) => ({
                    blocks,
                    resumes: syncActiveResume(state, { blocks }),
                })),

            // ── File actions ──────────────────────────────────────────────────

            setProjectFiles: (projectFiles) =>
                set((state) => ({
                    projectFiles,
                    resumes: syncActiveResume(state, { projectFiles }),
                })),

            updateFileContent: (name, content, source = 'code') =>
                set((state) => {
                    const projectFiles = state.projectFiles.map(f => {
                        if (f.name === name) {
                            // Don't update if content is exact match
                            if (f.content === content) return f;
                            return {
                                ...f,
                                content,
                                version: (f.version || 0) + 1,
                                lastEditor: source,
                                timestamp: Date.now()
                            };
                        }
                        return f;
                    });
                    return { projectFiles, resumes: syncActiveResume(state, { projectFiles }) };
                }),

            setActiveFileName: (activeFileName) =>
                set((state) => ({
                    activeFileName,
                    resumes: syncActiveResume(state, { activeFileName }),
                })),

            addFile: (name) =>
                set((state) => {
                    if (state.projectFiles.some(f => f.name === name)) return state;
                    const projectFiles = [
                        ...state.projectFiles, 
                        { name, content: '', version: 1, lastEditor: 'system' as const, timestamp: Date.now() }
                    ];
                    return {
                        projectFiles,
                        activeFileName: name,
                        resumes: syncActiveResume(state, { projectFiles, activeFileName: name }),
                    };
                }),

            deleteFile: (name) =>
                set((state) => {
                    const projectFiles = state.projectFiles.filter(f => f.name !== name);
                    const activeFileName = state.activeFileName === name
                        ? (projectFiles[0]?.name ?? null)
                        : state.activeFileName;
                    return {
                        projectFiles,
                        activeFileName,
                        resumes: syncActiveResume(state, { projectFiles, activeFileName }),
                    };
                }),

            // ── Template / settings ───────────────────────────────────────────

            setCustomTemplate: (customTemplate) => set({ customTemplate }),
            setApiKey: (apiKey) => set({ apiKey }),

            setTemplateOptions: (options) =>
                set((state) => {
                    const templateOptions = { ...state.templateOptions, ...options };
                    return { templateOptions, resumes: syncActiveResume(state, { templateOptions }) };
                }),

            // ── Resume management ─────────────────────────────────────────────

            setResumeId: (index, id) =>
                set((state) => {
                    const resumes = [...state.resumes];
                    if (resumes[index]) resumes[index] = { ...resumes[index], id };
                    return { resumes };
                }),

            loadResumes: (backendResumes) => {
                const state = get();
                const formatted: ResumeStorage[] = backendResumes.map(r => ({
                    id: r.id,
                    title: r.title,
                    blocks: r.canvasData?.nodes || [],
                    projectFiles: r.canvasData?.projectFiles?.map((f: any) => ({
                        ...f,
                        version: f.version || 1,
                        lastEditor: f.lastEditor || 'system',
                        timestamp: f.timestamp || Date.now()
                    })) || (r.canvasData?.fullLatex
                            ? [{ name: 'main.tex', content: r.canvasData.fullLatex, version: 1, lastEditor: 'system', timestamp: Date.now() }]
                            : [...DEFAULT_PROJECT_FILES]),
                    activeFileName: r.canvasData?.activeFileName || 'main.tex',
                    customTemplate: r.canvasData?.customTemplate || '',
                    templateOptions: r.canvasData?.templateOptions,
                }));

                if (formatted.length === 0) return;

                const newIndex = state.activeResumeIndex < formatted.length ? state.activeResumeIndex : 0;
                const active = formatted[newIndex];
                set({
                    resumes: formatted,
                    activeResumeIndex: newIndex,
                    blocks: active.blocks,
                    projectFiles: active.projectFiles,
                    activeFileName: active.activeFileName,
                    templateOptions: active.templateOptions ?? { ...DEFAULT_TEMPLATE_OPTIONS },
                });
            },

            switchResume: (index) => {
                const state = get();
                const resumes = saveCurrentToResumes(state);
                const target = resumes[index];
                if (!target) return;
                set({
                    resumes,
                    activeResumeIndex: index,
                    blocks: target.blocks,
                    projectFiles: target.projectFiles ?? [...DEFAULT_PROJECT_FILES],
                    activeFileName: target.activeFileName ?? 'main.tex',
                    templateOptions: target.templateOptions ?? { ...DEFAULT_TEMPLATE_OPTIONS },
                });
            },

            addResume: (data) => {
                const state = get();
                const resumes = saveCurrentToResumes(state);
                const newResume: ResumeStorage = {
                    id: data?.id,
                    title: data?.title || `Resume R_${resumes.length + 1}`,
                    blocks: data?.blocks || [],
                    projectFiles: data?.projectFiles || [...DEFAULT_PROJECT_FILES],
                    activeFileName: data?.activeFileName || 'main.tex',
                };
                resumes.push(newResume);
                const newIndex = resumes.length - 1;
                set({
                    resumes,
                    activeResumeIndex: newIndex,
                    blocks: newResume.blocks,
                    projectFiles: newResume.projectFiles,
                    activeFileName: newResume.activeFileName,
                    templateOptions: newResume.templateOptions ?? { ...DEFAULT_TEMPLATE_OPTIONS },
                });
            },

            deleteResume: (index) => {
                const state = get();
                if (state.resumes.length <= 1) return;
                const resumes = state.resumes.filter((_, i) => i !== index);
                const newIndex = Math.min(index, resumes.length - 1);
                const target = resumes[newIndex];
                set({
                    resumes,
                    activeResumeIndex: newIndex,
                    blocks: target.blocks,
                    projectFiles: target.projectFiles ?? [...DEFAULT_PROJECT_FILES],
                    activeFileName: target.activeFileName ?? 'main.tex',
                });
            },

            resetCanvas: () => {
                set({
                    resumes: [EMPTY_RESUME()],
                    activeResumeIndex: 0,
                    blocks: [],
                    projectFiles: [...DEFAULT_PROJECT_FILES],
                    activeFileName: 'main.tex',
                    customTemplate: '',
                });
                if (typeof localStorage !== 'undefined') {
                    localStorage.removeItem('resume-builder-storage-v6');
                }
            },
        }),
        { name: 'resume-builder-storage-v6' },
    ),
);

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns a new resumes array with the active entry updated from current state. */
function syncActiveResume(state: BuilderStore, patch: Partial<ResumeStorage>): ResumeStorage[] {
    const resumes = [...state.resumes];
    resumes[state.activeResumeIndex] = { ...resumes[state.activeResumeIndex], ...patch };
    return resumes;
}

/** Persist current editor state back into the active resume slot. */
function saveCurrentToResumes(state: BuilderStore): ResumeStorage[] {
    return syncActiveResume(state, {
        blocks: state.blocks,
        projectFiles: state.projectFiles,
        activeFileName: state.activeFileName,
        templateOptions: state.templateOptions,
    });
}

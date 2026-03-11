import { useBuilderStore } from '../store/useBuilderStore';
import { useCallback } from 'react';

/**
 * Custom hook to access and mutate a single block by ID.
 */
export const useBlock = (id: string) => {
    const data = useBuilderStore(
        useCallback((state) => state.blocks.find(b => b.id === id)?.data, [id]),
    );
    const updateBlock = useBuilderStore(s => s.updateBlock);
    const deleteBlock = useBuilderStore(s => s.deleteBlock);
    const toggleBlock = useBuilderStore(s => s.toggleBlock);
    const updateBlockPosition = useBuilderStore(s => s.updateBlockPosition);

    return {
        data,
        updateData: useCallback((newData: any) => updateBlock(id, newData), [id, updateBlock]),
        remove: useCallback(() => deleteBlock(id), [id, deleteBlock]),
        toggle: useCallback(() => toggleBlock(id), [id, toggleBlock]),
        setPosition: useCallback((x: number, y: number) => updateBlockPosition(id, x, y), [id, updateBlockPosition]),
    };
};

/**
 * Hook for global canvas actions (read from store, no cloud logic).
 */
export const useResumeActions = () => {
    const blocks = useBuilderStore(s => s.blocks);
    const addBlock = useBuilderStore(s => s.addBlock);
    const updateBlock = useBuilderStore(s => s.updateBlock);
    const toggleBlock = useBuilderStore(s => s.toggleBlock);
    const updateBlockPosition = useBuilderStore(s => s.updateBlockPosition);
    const setBlocks = useBuilderStore(s => s.setBlocks);

    const apiKey = useBuilderStore(s => s.apiKey);
    const setApiKey = useBuilderStore(s => s.setApiKey);
    const customTemplate = useBuilderStore(s => s.customTemplate);
    const setCustomTemplate = useBuilderStore(s => s.setCustomTemplate);
    const templateOptions = useBuilderStore(s => s.templateOptions);
    const setTemplateOptions = useBuilderStore(s => s.setTemplateOptions);

    const resumes = useBuilderStore(s => s.resumes);
    const activeResumeIndex = useBuilderStore(s => s.activeResumeIndex);
    const switchResume = useBuilderStore(s => s.switchResume);
    const addResume = useBuilderStore(s => s.addResume);
    const deleteResume = useBuilderStore(s => s.deleteResume);
    const setResumeId = useBuilderStore(s => s.setResumeId);
    const loadResumes = useBuilderStore(s => s.loadResumes);
    const resetCanvas = useBuilderStore(s => s.resetCanvas);

    const projectFiles = useBuilderStore(s => s.projectFiles);
    const activeFileName = useBuilderStore(s => s.activeFileName);
    const setProjectFiles = useBuilderStore(s => s.setProjectFiles);
    const updateFileContent = useBuilderStore(s => s.updateFileContent);
    const setActiveFileName = useBuilderStore(s => s.setActiveFileName);
    const addFile = useBuilderStore(s => s.addFile);
    const deleteFile = useBuilderStore(s => s.deleteFile);

    const token = useBuilderStore(s => s.token);
    const userEmail = useBuilderStore(s => s.userEmail);
    const setToken = useBuilderStore(s => s.setToken);

    const aiProvider = useBuilderStore(s => s.aiProvider);
    const setAiProvider = useBuilderStore(s => s.setAiProvider);

    return {
        // Auth
        token, userEmail, setToken,
        // Blocks
        blocks, addBlock, updateData: updateBlock, toggleBlock, updateBlockPosition, setBlocks,
        // API key / template
        apiKey, setApiKey, customTemplate, setCustomTemplate, templateOptions, setTemplateOptions,
        // Resume management
        resumes, activeResumeIndex, switchResume, addResume, deleteResume,
        setResumeId, loadResumes, resetCanvas,
        // Files
        projectFiles, activeFileName, setProjectFiles, updateFileContent,
        setActiveFileName, addFile, deleteFile,
        // AI Provider
        aiProvider, setAiProvider,
    };
};

import { useBuilderStore } from '../store/useBuilderStore';
import { useCallback } from 'react';

/**
 * Custom hook to encapsulate block-specific logic and state access.
 */
export const useBlock = (id: string) => {
    const data = useBuilderStore(
        useCallback((state) => state.blocks.find((b) => b.id === id)?.data, [id])
    );

    const updateBlock = useBuilderStore((state) => state.updateBlock);
    const deleteBlock = useBuilderStore((state) => state.deleteBlock);
    const updateBlockPosition = useBuilderStore((state) => state.updateBlockPosition);

    const updateData = useCallback(
        (newData: any) => updateBlock(id, newData),
        [id, updateBlock]
    );

    const remove = useCallback(() => deleteBlock(id), [id, deleteBlock]);

    const setPosition = useCallback(
        (x: number, y: number) => updateBlockPosition(id, x, y),
        [id, updateBlockPosition]
    );

    return {
        data,
        updateData,
        remove,
        setPosition
    };
};

/**
 * Hook for global canvas actions.
 */
export const useResumeActions = () => {
    const blocks = useBuilderStore((state) => state.blocks);
    const addBlock = useBuilderStore((state) => state.addBlock);
    const updateBlock = useBuilderStore((state) => state.updateBlock);
    const updateBlockPosition = useBuilderStore((state) => state.updateBlockPosition);
    const apiKey = useBuilderStore((state) => state.apiKey);
    const setApiKey = useBuilderStore((state) => state.setApiKey);
    const customTemplate = useBuilderStore((state) => state.customTemplate);
    const setCustomTemplate = useBuilderStore((state) => state.setCustomTemplate);

    const setBlocks = useBuilderStore((state) => state.setBlocks);
    const switchResume = useBuilderStore((state) => state.switchResume);
    const activeResumeIndex = useBuilderStore((state) => state.activeResumeIndex);
    const setFullLatex = useBuilderStore((state) => state.setFullLatex);
    const addResume = useBuilderStore((state) => state.addResume);
    const deleteResume = useBuilderStore((state) => state.deleteResume);
    const resumes = useBuilderStore((state) => state.resumes);
    const fullLatex = useBuilderStore((state) => state.fullLatex);
    
    // Auth
    const token = useBuilderStore((state) => state.token);
    const setToken = useBuilderStore((state) => state.setToken);
    const logout = useBuilderStore((state) => state.logout);
    const viewState = useBuilderStore((state) => state.viewState);
    const setViewState = useBuilderStore((state) => state.setViewState);

    return {
        blocks,
        addBlock,
        updateData: updateBlock,
        updateBlockPosition,
        apiKey,
        setApiKey,
        customTemplate,
        setCustomTemplate,
        setBlocks,
        switchResume,
        activeResumeIndex,
        setFullLatex,
        addResume,
        deleteResume,
        resumes,
        fullLatex,
        token,
        setToken,
        logout,
        viewState,
        setViewState
    };
};

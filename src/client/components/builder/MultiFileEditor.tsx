import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { FileTree } from './FileTree';
import { Save, Play, Sparkles, Loader2, FileCode, RefreshCcw, X, Wand2, AlertTriangle } from 'lucide-react';
import { useBuilderStore } from '../../store/useBuilderStore';
import { manualLatexGenerator } from '../../services/manualLatex';
import { geminiService } from '../../services/ai';
import toast from 'react-hot-toast';

interface MultiFileEditorProps {
    onCompile?: (latex: string, filename?: string) => void;
    isCompiling?: boolean;
    onAiAssemble?: () => Promise<void>;
    isAssembling?: boolean;
}

export function MultiFileEditor({ onCompile, isCompiling, onAiAssemble, isAssembling }: MultiFileEditorProps) {
    const [activeFile, setActiveFile] = useState<string | null>(null);
    const [content, setContent] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [showAiPrompt, setShowAiPrompt] = useState(false);
    const [aiInstruction, setAiInstruction] = useState('');
    const { blocks, apiKey, updateFileContent, projectFiles } = useBuilderStore();
    const initialSyncDone = useRef(false);
    const lastStoreContent = useRef<{ version: number, content: string } | null>(null);

    // Auto-select first file if none active
    useEffect(() => {
        if (!activeFile && !initialSyncDone.current && projectFiles.length > 0) {
            initialSyncDone.current = true;
            if (projectFiles.some(f => f.name === 'main.tex')) {
                handleFileSelect('main.tex');
            } else {
                handleFileSelect(projectFiles[0].name);
            }
        }
    }, [activeFile, projectFiles]);
    // Sync local content with store when projectFiles change
    useEffect(() => {
        if (activeFile) {
            const file = projectFiles.find(f => f.name === activeFile);
            if (file) {
                // If the store content changed and we haven't synced this version
                if (file.version !== lastStoreContent.current?.version && file.content !== content) {
                    if (!isSaving && !isAiLoading) {
                        setContent(file.content);
                        lastStoreContent.current = { version: file.version, content: file.content };
                        
                        // If canvas updated blocks and generated a new main.tex, it would be 'canvas'.
                        // But wait, the blocks -> file sync happens where? We'll put it below!
                    }
                } else if (file.version === lastStoreContent.current?.version) {
                    // Just ensure refs match
                    lastStoreContent.current = { version: file.version, content: file.content };
                }
            }
        }
    }, [projectFiles, activeFile, content, isSaving, isAiLoading]);

    // Handle bidirectional sync: Update file when blocks change, if not currently editing code
    const lastBlocksRef = useRef(blocks);
    useEffect(() => {
        if (blocks !== lastBlocksRef.current) {
            lastBlocksRef.current = blocks;
            // Blocks changed (probably from canvas). We should update main.tex.
            const mainFile = projectFiles.find(f => f.name === 'main.tex');
            
            // Only auto-update if last editor was NOT code, or we choose to overwrite to keep them in sync
            if (mainFile) {
                 const freshLatex = manualLatexGenerator.generate(blocks);
                 if (freshLatex !== mainFile.content && mainFile.lastEditor !== 'code') {
                     updateFileContent('main.tex', freshLatex, 'canvas');
                 }
            }
        }
    }, [blocks, projectFiles, updateFileContent]);

    const handleFileSelect = async (path: string) => {
        try {
            const fileStore = useBuilderStore.getState().projectFiles.find(f => f.name === path);
            const text = fileStore?.content || '';
            
            setActiveFile(path);
            setContent(text);
        } catch (e: any) {
            console.error(e);
        }
    };

    const handleSave = async (overrideContent?: string) => {
        if (!activeFile) return;
        const textToSave = overrideContent !== undefined ? overrideContent : content;
        setIsSaving(true);
        try {
            // 1. Update memory/store
            updateFileContent(activeFile, textToSave, 'code');
            const fileStore = useBuilderStore.getState().projectFiles.find(f => f.name === activeFile);
            if (fileStore) {
                 lastStoreContent.current = { version: fileStore.version, content: fileStore.content };
            }

            // 2. Persist to Disk if reachable (Belt and Suspenders for LOCAL mode)
            const { fileService } = await import('../../services/files');
            await fileService.writeFile(activeFile, textToSave);
            
            toast.success(`Saved ${activeFile} to disk.`);
        } catch (e: any) {
            console.warn('[EDITOR] Disk save skipped or failed:', e.message);
            // toast.error(e.message); // Silent fail if not supported or not logged in
        } finally {
            setIsSaving(false);
        }
    };

    const handleSyncFromCanvas = () => {
        if (!activeFile) return;
        toast((t) => (
            <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#1e2028]">Overwrite with Visual Builder?</span>
                <div className="flex gap-2">
                    <button 
                        onClick={() => { 
                            const freshLatex = manualLatexGenerator.generate(blocks);
                            setContent(freshLatex);
                            toast.dismiss(t.id); 
                            toast.success("Synced from Visual Builder");
                        }}
                        className="px-2 py-1 bg-blue-500 text-white rounded text-[8px] font-black uppercase"
                    >
                        Confirm
                    </button>
                    <button 
                        onClick={() => toast.dismiss(t.id)}
                        className="px-2 py-1 bg-zinc-200 text-zinc-600 rounded text-[8px] font-black uppercase"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        ), { duration: 5000, position: 'top-center' });
    };

    const handleAiEdit = async () => {
        if (!aiInstruction.trim() || !activeFile) return;
        setIsAiLoading(true);
        const fileToSave = activeFile; // capture
        try {
            const result = await geminiService.editFile(content, aiInstruction, undefined, apiKey);
            setContent(result);
            
            updateFileContent(fileToSave, result, 'code');
            
            // Run standard save pipeline for AST sync
            await handleSave(result); 
            
            setShowAiPrompt(false);
            setAiInstruction('');
            toast.success(`AI Edit saved to ${fileToSave}`);
        } catch (e: any) {
            toast.error(`AI Edit failed: ${e.message}`);
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleCompileInternal = async () => {
        await handleSave();
        if (onCompile) {
            let compileContent = content;
            let compileFile = activeFile;
            if (activeFile !== 'main.tex') {
                const mainFileFromStore = projectFiles.find(f => f.name === 'main.tex');
                if (mainFileFromStore) {
                    compileContent = mainFileFromStore.content;
                    compileFile = 'main.tex';
                }
            }
            onCompile(compileContent, compileFile || undefined);
        }
    };

    return (
        <div className="flex h-full w-full bg-white dark:bg-[#0b0c0e] overflow-hidden rounded-xl border border-zinc-200 dark:border-[#2d3042] shadow-2xl">
            <FileTree onFileSelect={handleFileSelect} activeFile={activeFile || undefined} />
            
            <div className="flex-1 flex flex-col min-w-0 h-full relative">
                <div className="h-14 px-6 border-b border-zinc-100 dark:border-[#2d3042] flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/10 shrink-0">
                    <div className="flex items-center gap-4 truncate">
                         <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 shrink-0">Editor_Session</span>
                         {activeFile && (
                           <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full border border-zinc-200 dark:border-zinc-700 truncate">
                              <span className="text-[9px] font-bold text-zinc-600 dark:text-zinc-300 truncate">{activeFile}</span>
                           </div>
                         )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button 
                            onClick={() => setShowAiPrompt(!showAiPrompt)}
                            className={`p-1.5 transition-all rounded-md ${showAiPrompt ? 'bg-blue-500 text-white' : 'text-zinc-400 hover:text-blue-500'}`}
                            title="AI Magic Edit"
                        >
                            <Sparkles size={16} />
                        </button>
                        <button 
                            onClick={handleSyncFromCanvas}
                            title="Quick Sync (Local)"
                            className="p-1.5 text-zinc-400 hover:text-blue-500 transition-colors"
                        >
                            <RefreshCcw size={14} />
                        </button>
                        <button 
                            onClick={() => onAiAssemble?.()}
                            disabled={isAssembling || !activeFile}
                            title="AI Assemble (Canvas -> Code)"
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded text-[9px] font-bold uppercase tracking-widest hover:bg-blue-100 dark:hover:bg-blue-900/40 disabled:opacity-50 transition-all border border-blue-200 dark:border-blue-800/50"
                        >
                            {isAssembling ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                            AI ASSEMBLE
                        </button>
                        <button 
                            onClick={() => handleSave()}
                            disabled={isSaving || !activeFile}
                            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded text-[9px] font-bold uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 transition-all"
                        >
                            {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                            SAVE
                        </button>
                        <button 
                            onClick={handleCompileInternal}
                            disabled={isCompiling || !activeFile}
                            className="flex items-center gap-2 px-4 py-1.5 bg-black dark:bg-white text-white dark:text-black rounded text-[9px] font-bold uppercase tracking-widest hover:opacity-80 transition-all shadow-lg shadow-black/10"
                        >
                            {isCompiling ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                            COMPILE
                        </button>
                    </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/20 px-6 py-2 border-b border-amber-100 dark:border-amber-900/30 flex items-start gap-3">
                    <div className="mt-0.5 text-amber-500">
                        <AlertTriangle size={12} />
                    </div>
                    <p className="text-[10px] text-amber-700 dark:text-amber-400/80 leading-relaxed font-medium">
                        <strong>PRO TIP:</strong> If your template uses custom <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">.cls</code> or <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">.sty</code> files, 
                        make sure to upload them to the project via the file explorer on the left.
                    </p>
                </div>

                <div className="flex-1 min-h-0 relative bg-white dark:bg-[#1e1e1e]">
                    {activeFile ? (
                        <>
                            <Editor
                                height="100%"
                                defaultLanguage="latex"
                                value={content}
                                onChange={(v: string | undefined) => setContent(v || '')}
                                theme="vs-dark"
                                options={{
                                    fontSize: 15,
                                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                    minimap: { enabled: false },
                                    scrollBeyondLastLine: false,
                                    lineNumbers: 'on',
                                    padding: { top: 20 },
                                    cursorSmoothCaretAnimation: "on",
                                    automaticLayout: true,
                                    wordWrap: 'on',
                                    tabSize: 2
                                }}
                            />
                            {showAiPrompt && (
                                <div className="absolute bottom-6 left-6 right-6 z-50 animate-in slide-in-from-bottom-4 duration-300">
                                    <div className="bg-white dark:bg-[#1a1b1e] border border-blue-500/30 shadow-2xl rounded-xl p-1 flex items-center gap-2 backdrop-blur-md">
                                        <div className="pl-4 text-blue-500">
                                            <Wand2 size={16} />
                                        </div>
                                        <input 
                                            autoFocus
                                            placeholder="Ask AI to modify this file... (e.g. 'Add a new section for certifications')"
                                            className="flex-1 bg-transparent border-none outline-none py-3 px-2 text-[14px] font-medium text-zinc-800 dark:text-zinc-200"
                                            value={aiInstruction}
                                            onChange={(e) => setAiInstruction(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleAiEdit();
                                                if (e.key === 'Escape') setShowAiPrompt(false);
                                            }}
                                        />
                                        <button 
                                            onClick={handleAiEdit}
                                            disabled={isAiLoading || !aiInstruction.trim()}
                                            className="px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center gap-2"
                                        >
                                            {isAiLoading ? <Loader2 size={12} className="animate-spin" /> : 'Apply'}
                                        </button>
                                        <button 
                                            onClick={() => setShowAiPrompt(false)}
                                            className="p-2 text-zinc-400 hover:text-black dark:hover:text-white mr-1"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center opacity-10 gap-6 select-none">
                           <FileCode size={80} strokeWidth={1} />
                           <div className="text-center">
                               <p className="text-[14px] font-black uppercase tracking-[0.4em] mb-1">Central_Workspace</p>
                               <p className="text-[8px] font-bold uppercase tracking-widest text-zinc-500">Pick_a_Reference_for_Initialisation</p>
                           </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

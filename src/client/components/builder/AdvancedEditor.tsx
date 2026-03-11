import React, { useState, useEffect, useRef } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import { useResumeActions } from '../../hooks/useResume';
import { FileExplorer } from './FileExplorer';
import { geminiService } from '../../services/ai';
import { manualLatexGenerator } from '../../services/manualLatex';
import { Sparkles, Loader2, X, Send, Terminal, Play, FileText, Download, CheckCircle2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface AdvancedEditorProps {
    onCompile: () => void;
    isCompiling: boolean;
}

export const AdvancedEditor: React.FC<AdvancedEditorProps> = ({ onCompile, isCompiling }) => {
    const {
        projectFiles,
        activeFileName,
        updateFileContent,
        apiKey,
        blocks
    } = useResumeActions();

    const activeFile = projectFiles.find(f => f.name === activeFileName);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [showAiInput, setShowAiInput] = useState(false);
    const editorRef = useRef<any>(null);
    const monacoRef = useRef<Monaco | null>(null);

    const handleEditorDidMount = (editor: any, monaco: Monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;

        // Custom keyboard shortcut for AI (Ctrl+I)
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI, () => {
            setShowAiInput(true);
        });

        // Custom keyboard shortcut for Compile (Ctrl+Enter)
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
            onCompile();
        });
    };

    const handleAiSubmit = async () => {
        if (!aiPrompt || !editorRef.current) return;

        setIsAiLoading(true);
        const selection = editorRef.current.getSelection();
        const selectedText = editorRef.current.getModel().getValueInRange(selection);
        const fullContent = editorRef.current.getValue();

        try {
            const prompt = `
                Follow this instruction: "${aiPrompt}"
                ${selectedText ? `Apply it to this selected text: ${selectedText}` : `Apply it to the current context.`}
                Current document:
                ${fullContent}
                
                Return ONLY the replacement code or the new code. No markdown fences, no explanations.
            `;

            // We'll add this method to geminiService shortly
            const result = await (geminiService as any).genericAiCommand(prompt, fullContent, apiKey);

            if (result) {
                const range = selectedText
                    ? selection
                    : editorRef.current.getSelection(); // Replace selection or insert at cursor

                editorRef.current.executeEdits('ai-assistant', [{
                    range: range,
                    text: result,
                    forceMoveMarkers: true
                }]);

                toast.success('AI execution complete');
                setShowAiInput(false);
                setAiPrompt('');
            }
        } catch (error: any) {
            toast.error(error.message || 'AI failed');
        } finally {
            setIsAiLoading(false);
        }
    };

    return (
        <div className="flex-1 flex overflow-hidden bg-white dark:bg-black relative">
            <FileExplorer />

            <div className="flex-1 flex flex-col min-w-0 relative">
                <header className="h-10 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#1a1b1e] flex items-center justify-between px-4">
                    <div className="flex items-center gap-2">
                        <Terminal size={14} className="text-zinc-400" />
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                            {activeFileName || 'No_File_Selected'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowAiInput(!showAiInput)}
                            className={`flex items-center gap-2 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest transition-all ${showAiInput
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-blue-500'
                                }`}
                        >
                            <Sparkles size={12} />
                            Code_AI
                        </button>
                        <button
                            onClick={() => {
                                const freshLatex = manualLatexGenerator.generate(blocks || []);
                                updateFileContent('main.tex', freshLatex);
                                toast.success('Synced from visual canvas');
                            }}
                            className="flex items-center gap-2 px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-blue-500 rounded text-[10px] font-bold uppercase tracking-widest transition-all"
                            title="Pull latest changes from Visual Canvas"
                        >
                            <RefreshCw size={12} />
                            Sync_Board
                        </button>
                        <button
                            onClick={onCompile}
                            disabled={isCompiling}
                            className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded text-[10px] font-bold uppercase tracking-widest hover:bg-green-700 disabled:opacity-50 transition-all"
                        >
                            {isCompiling ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                            Build
                        </button>
                    </div>
                </header>

                <div className="flex-1 relative">
                    {activeFile ? (
                        <Editor
                            height="100%"
                            language="latex"
                            theme="vs-dark"
                            value={activeFile.content}
                            onChange={(value) => updateFileContent(activeFile.name, value || '')}
                            onMount={handleEditorDidMount}
                            options={{
                                fontSize: 18,
                                minimap: { enabled: false },
                                scrollBeyondLastLine: false,
                                lineNumbers: 'on',
                                roundedSelection: false,
                                padding: { top: 10 },
                                cursorBlinking: 'smooth',
                                smoothScrolling: true,
                                contextmenu: true,
                                automaticLayout: true,
                            }}
                        />
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-zinc-400 font-mono text-xs uppercase tracking-[0.2em]">
                            Select a file to begin editing
                        </div>
                    )}

                    {/* Inline AI Input Box */}
                    {showAiInput && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-xl z-[60] animate-in slide-in-from-top-4 duration-300">
                            <div className="bg-white dark:bg-[#1e1f23] border border-blue-500/30 rounded-xl shadow-2xl p-4 flex flex-col gap-3 ring-4 ring-blue-500/5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Sparkles size={14} className="text-blue-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">AI_Inline_Forge</span>
                                    </div>
                                    <button onClick={() => setShowAiInput(false)} className="text-zinc-500 hover:text-white transition-colors">
                                        <X size={14} />
                                    </button>
                                </div>
                                <div className="relative">
                                    <textarea
                                        autoFocus
                                        className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 text-base outline-none focus:border-blue-500/50 transition-all min-h-[80px] resize-none pr-12 text-zinc-800 dark:text-zinc-200"
                                        placeholder="Ask AI to write some LaTeX, refactor code, or fix errors..."
                                        value={aiPrompt}
                                        onChange={(e) => setAiPrompt(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                                handleAiSubmit();
                                            }
                                        }}
                                    />
                                    <button
                                        onClick={handleAiSubmit}
                                        disabled={isAiLoading || !aiPrompt}
                                        className="absolute bottom-3 right-3 p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-all"
                                    >
                                        {isAiLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                    </button>
                                </div>
                                <div className="flex items-center justify-between text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
                                    <span>Ctrl + Enter to Submit</span>
                                    {isAiLoading && <span className="animate-pulse">Reasoning...</span>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

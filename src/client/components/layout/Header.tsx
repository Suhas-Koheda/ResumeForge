import React from 'react';
import { 
    Terminal, Sparkles, User, RefreshCw, Save, 
    Terminal as TerminalIcon, ChevronDown, Download, 
    FileText, Type, Layers, Menu, Moon, Sun, Plus, X,
    FileDown
} from 'lucide-react';
import toast from 'react-hot-toast';

interface HeaderProps {
    serverMode: 'LOCAL' | 'CLOUD' | 'LOADING';
    blocks: any[];
    setIsOnboardingOpen: (val: boolean) => void;
    token: string | null;
    userEmail: string | null;
    setToken: (token: string | null, email: string | null) => void;
    setShowAuth: (val: boolean) => void;
    resumes: any[];
    activeResumeIndex: number;
    switchResume: (idx: number) => void;
    handleDeleteResume: (idx: number) => void;
    addResume: () => void;
    hasUnsavedChanges: boolean;
    isSaving: boolean;
    saveToServer: (manual?: boolean) => Promise<void>;
    showBuildOutput: boolean;
    setShowBuildOutput: (val: boolean) => void;
    projectFiles: any[];
    updateFileContent: (name: string, content: string, source: any) => void;
    manualLatexGenerator: any;
    aiProvider: string;
    setAiProvider: (val: any) => void;
    isDark: boolean;
    setIsDark: (val: boolean) => void;
    showExportMenu: boolean;
    setShowExportMenu: (val: boolean) => void;
    downloadPdf: (download?: boolean) => void;
    downloadTex: () => void;
    downloadJson: () => void;
    handleAssemble: (forceAi?: boolean) => void;
    setIsMobileMenuOpen: (val: boolean) => void;
    isMobileMenuOpen: boolean;
    isAssembling: boolean;
}

function DropdownBtn({ icon: Icon, label, onClick, highlighted = false }: {
    icon: React.ElementType; label: string; onClick: () => void; highlighted?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-3 py-2 text-[11px] font-bold uppercase tracking-widest rounded transition-all text-left ${highlighted
                ? 'text-zinc-800 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border-t border-zinc-100 dark:border-zinc-800 mt-1'
                : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900/20'}`}
        >
            <Icon size={12} /> {label}
        </button>
    );
}

export const Header: React.FC<HeaderProps> = ({
    serverMode, blocks, setIsOnboardingOpen, token, userEmail, setToken, setShowAuth,
    resumes, activeResumeIndex, switchResume, handleDeleteResume, addResume,
    hasUnsavedChanges, isSaving, saveToServer, showBuildOutput, setShowBuildOutput,
    projectFiles, updateFileContent, manualLatexGenerator, aiProvider, setAiProvider,
    isDark, setIsDark, showExportMenu, setShowExportMenu, downloadPdf, downloadTex,
    downloadJson, handleAssemble, setIsMobileMenuOpen, isMobileMenuOpen, isAssembling
}) => {
    return (
        <header className="h-10 sm:h-12 border-b border-zinc-200 dark:border-[#2d3042] bg-white dark:bg-[#1e2028] flex items-center justify-between px-2 sm:px-4 z-[60] relative shrink-0">
            <div className="flex items-center gap-2 sm:gap-6">
                {/* Logo */}
                <div className="flex items-center gap-1.5 sm:gap-2 mr-2">
                    <TerminalIcon size={12} className="text-black dark:text-white" />
                    <span className="text-[10px] sm:text-[10.5px] font-black uppercase tracking-[0.12em] sm:tracking-[0.15em] text-black dark:text-white whitespace-nowrap">
                        ResumeForge<span className="hidden sm:inline">.{serverMode.toLowerCase()}</span>
                    </span>
                </div>

                {/* Onboarding / Auth Button */}
                <div className="flex items-center gap-2">
                    {blocks.length === 0 && (
                        <button
                            onClick={() => setIsOnboardingOpen(true)}
                            className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black hover:opacity-80 transition-all font-bold whitespace-nowrap"
                        >
                            <Sparkles size={10} className="sm:w-3 sm:h-3" />
                            <span className="text-[9.5px] sm:text-[10.5px] font-black uppercase tracking-widest">INITIALISE</span>
                        </button>
                    )}

                    {serverMode === 'CLOUD' && (
                        <div className="flex items-center gap-2">
                            {token && userEmail && (
                                <div className="hidden md:flex flex-col items-end mr-1">
                                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none">Register_ID</span>
                                    <span className="text-[11px] font-bold text-black dark:text-white leading-tight">{userEmail}</span>
                                </div>
                            )}
                            <button
                                onClick={() => token ? setToken(null, null) : setShowAuth(true)}
                                className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all font-bold text-zinc-600 dark:text-zinc-400"
                            >
                                <User size={10} className="sm:w-3 sm:h-3" />
                                <span className="text-[10px] sm:text-[12px] uppercase font-black tracking-widest">
                                    {token ? 'LOGOUT' : 'LOGIN'}
                                </span>
                            </button>
                        </div>
                    )}
                </div>

                <div className="hidden lg:block w-px h-4 bg-zinc-200 dark:bg-zinc-800" />

                {/* Resume tabs */}
                <div className="hidden sm:flex gap-1 bg-zinc-100 dark:bg-[#111215] p-0.5 sm:p-1 border border-zinc-200 dark:border-[#2d3042] rounded-full overflow-x-auto no-scrollbar">
                    {resumes.map((_, idx) => (
                        <div key={idx} className="relative group/pill flex items-center shrink-0">
                            <button
                                onClick={() => switchResume(idx)}
                                className={`px-3 py-0.5 sm:py-1 text-[8px] sm:text-[9px] font-bold uppercase tracking-widest transition-all rounded-full ${activeResumeIndex === idx
                                    ? 'bg-black text-white dark:bg-white dark:text-black shadow'
                                    : 'text-zinc-400 hover:text-black dark:hover:text-white'}`}
                            >
                                R_{idx + 1}
                            </button>
                            {resumes.length > 1 && idx === activeResumeIndex && (
                                <button
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        toast((t) => (
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#1e2028]">Delete Resume R_{idx + 1}?</span>
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => { handleDeleteResume(idx); toast.dismiss(t.id); }}
                                                        className="px-2 py-1 bg-red-500 text-white rounded text-[8px] font-black uppercase"
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
                                    }}
                                    className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-red-100 dark:hover:bg-red-900/40 text-red-500 ml-1"
                                >
                                    <X size={8} />
                                </button>
                            )}
                        </div>
                    ))}
                    <button onClick={() => addResume()} className="px-2 py-0.5 sm:py-1 text-[9px] font-bold text-zinc-400 hover:text-black dark:hover:text-white shrink-0">
                        <Plus size={10} />
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-4">
                {/* Saving indicator + controls (desktop) */}
                <div className="hidden lg:flex items-center gap-4">
                     {hasUnsavedChanges && !isSaving && (
                        <button 
                            onClick={() => saveToServer(true)}
                            className="flex items-center gap-1.5 px-3 py-1 bg-amber-500 text-white rounded-full hover:bg-amber-600 transition-all shadow-sm active:scale-95"
                        >
                            <RefreshCw size={10} className="animate-spin" />
                            <span className="text-[9.5px] font-black uppercase tracking-widest">SYNC PENDING</span>
                        </button>
                    )}
                    {isSaving && (
                        <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest animate-pulse">
                            <Save size={10} /> Saving…
                        </div>
                    )}
                    {!hasUnsavedChanges && !isSaving && (
                        <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500 uppercase tracking-widest opacity-60">
                            <Save size={10} /> All Synced
                        </div>
                    )}
                </div>
                <button
                    onClick={() => {
                        if (!showBuildOutput) {
                            const freshLatex = manualLatexGenerator.generate(blocks);
                            const mainFile = projectFiles.find((f: any) => f.name === 'main.tex');
                            if (!mainFile?.content || mainFile.content.trim().length < 50) {
                                // Use 'system' so opening the editor doesn't dirty the save indicator
                                // or invalidate the AI assembly cache
                                updateFileContent('main.tex', freshLatex, 'system');
                            }
                        }
                        setShowBuildOutput(!showBuildOutput);
                    }}
                    className={`text-zinc-400 hover:text-black dark:hover:text-white p-1 transition-all ${showBuildOutput ? 'text-black dark:text-white' : ''}`}
                    title="Open Editor"
                >
                    <TerminalIcon size={14} />
                </button>
                <button
                    onClick={() => {
                        if (serverMode === 'CLOUD') {
                            toast.error('Ollama is only available in Local mode.');
                            return;
                        }
                        setAiProvider(aiProvider === 'gemini' ? 'ollama' : 'gemini');
                    }}
                    className={`relative flex items-center gap-1.5 border rounded-full px-3 py-1 transition-all hover:scale-105 active:scale-95 ${
                        aiProvider === 'ollama' && serverMode !== 'CLOUD' 
                            ? 'border-purple-500 bg-purple-500/10 text-purple-500' 
                            : 'border-blue-500 bg-blue-500/10 text-blue-500'
                    } ${serverMode === 'CLOUD' ? 'opacity-70 grayscale-[0.5]' : ''}`}
                    title={serverMode === 'CLOUD' ? "Gemini Engine (Ollama not available in Cloud)" : `Provider: ${aiProvider.toUpperCase()}`}
                >
                    <Sparkles size={10} className={aiProvider === 'ollama' && serverMode !== 'CLOUD' ? 'text-purple-500' : 'text-blue-500'} />
                    <span className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap">
                        {serverMode === 'CLOUD' ? 'Gemini' : aiProvider}
                    </span>
                </button>
                <button onClick={() => setIsDark(!isDark)} className="text-zinc-400 hover:text-black dark:hover:text-white p-1" title="Toggle Theme">
                    {isDark ? <Sun size={14} /> : <Moon size={14} />}
                </button>

                {/* Export menu */}
                <div className="flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 p-0.5 sm:p-1 relative">
                     <button
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        className="px-2 sm:px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] bg-black dark:bg-white text-white dark:text-black hover:opacity-90 transition-all flex items-center gap-1 sm:gap-2"
                    >
                        <Download size={10} />
                        <span className="hidden sm:inline">EXPORT</span>
                        <ChevronDown size={8} className={`transition-transform duration-200 ${showExportMenu ? 'rotate-180' : ''}`} />
                    </button>

                    {showExportMenu && (
                        <>
                            <div className="fixed inset-0 z-[60]" onClick={() => setShowExportMenu(false)} />
                            <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-[#1e2028] border border-zinc-200 dark:border-[#2d3042] p-1 z-[70] shadow-2xl rounded shadow-black/20">
                                <div className="p-2 border-b border-zinc-100 dark:border-[#2d3042] mb-1">
                                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Download_Vector</p>
                                </div>
                                <DropdownBtn icon={FileText} label="Export PDF (.pdf)" onClick={() => { downloadPdf(); setShowExportMenu(false); }} />
                                <DropdownBtn icon={Type} label="Export LaTeX (.tex)" onClick={() => { downloadTex(); setShowExportMenu(false); }} />
                                <DropdownBtn icon={Layers} label="Export JSON (.rf.json)" onClick={() => { downloadJson(); setShowExportMenu(false); }} highlighted />
                                
                                <div className="p-2 border-t border-zinc-100 dark:border-[#2d3042] mt-1 mb-1">
                                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Inbound_Data</p>
                                </div>
                                <DropdownBtn icon={FileDown} label="Import JSON (.rf.json)" onClick={() => { (document.getElementById('json-import-input') as any)?.click(); setShowExportMenu(false); }} />
                            </div>
                        </>
                    )}

                    <button
                        onClick={() => handleAssemble(true)}
                        disabled={isAssembling}
                        className="hidden sm:flex px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.15em] bg-blue-600 border border-blue-600 text-white hover:bg-blue-700 transition-all items-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-500/20"
                    >
                        <Sparkles size={10} /> AI COMPILE
                    </button>

                    <button
                        onClick={() => handleAssemble()}
                        disabled={isAssembling}
                        className="hidden sm:flex px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.15em] border border-black dark:border-white text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all items-center gap-2 disabled:opacity-50"
                    >
                        <RefreshCw size={10} /> SYNC & COMPILE
                    </button>

                    <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden p-1.5 text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white">
                        <Menu size={16} />
                    </button>
                </div>
            </div>
        </header>
    );
};

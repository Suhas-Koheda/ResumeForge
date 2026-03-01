import React, { memo, useState, useEffect } from 'react';
import { ResumeCanvas } from './components/builder/ResumeCanvas';
import { useResumeActions } from './hooks/useResume';
import {
    Plus, Settings as SettingsIcon, Layout, Sun, Moon,
    Briefcase, GraduationCap, Code, Rocket, FileText, Layers,
    Loader2, Sparkles, X, Terminal, Copy, User, Download, LogOut, Cloud, Trash2, Menu, ChevronDown, Map, Save, Key, RefreshCw
} from 'lucide-react';
import { ResumeBlock, BlockType } from '@shared/types';
import { OnboardingModal } from './components/ui/OnboardingModal';
import { Landing } from './components/ui/Landing';
import { Auth } from './components/ui/Auth';
import { geminiService } from './services/ai';
import { manualLatexGenerator } from './services/manualLatex';
import { latexServerService } from './services/latex';
import { offlineLatexParser } from './services/offlineParser';

function App() {
    const {
        addBlock, apiKey, setApiKey, blocks,
        customTemplate, setCustomTemplate,
        activeResumeIndex, switchResume, addResume, deleteResume, resumes,
        fullLatex, setFullLatex,
        viewState, setViewState,
        token, logout, setToken, setBlocks,
        setResumeId, loadResumes, userEmail
    } = useResumeActions();
    
    const [isSaving, setIsSaving] = useState(false);
    const [isDark, setIsDark] = useState(false);
    const [isAssembling, setIsAssembling] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [previewMode, setPreviewMode] = useState<'code' | 'pdf'>('pdf');
    const [showBuildOutput, setShowBuildOutput] = useState(false);
    const [compilationLog, setCompilationLog] = useState<string | null>(null);
    const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
    const [isLocalMode, setIsLocalMode] = useState(() => {
        return typeof window !== 'undefined' &&
            (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    });
    const [showProfile, setShowProfile] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // 1. Init: Fetch resumes from backend when token becomes available (login)
    useEffect(() => {
        if (token && viewState === 'canvas') {
            const fetchResumes = async () => {
                try {
                    console.log("[LOG_APP] Fetching resumes from cloud...");
                    const url = `${(import.meta as any).env.VITE_API_URL || '/api/v1'}/resumes`;
                    const response = await fetch(url, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (response.ok) {
                        const data = await response.json();
                        console.log(`[LOG_APP] Successfully loaded ${data.length} resumes from cloud`);
                        loadResumes(data);
                    }
                } catch (e) {
                    console.error("[LOG_APP] Failed to fetch resumes:", e);
                }
            };
            fetchResumes();
        }
    }, [token, viewState, loadResumes]);

    // 2. Offline AST logic (Source to Blocks persistence)
    useEffect(() => {
        if (previewMode === 'code' && fullLatex) {
            const timer = setTimeout(() => {
                const extracted = offlineLatexParser.parseLatexBlocks(fullLatex);
                if (extracted.length > 0) {
                    const newBlocks = [...blocks];
                    const byType = newBlocks.reduce((acc, b) => {
                        acc[b.type] = acc[b.type] || [];
                        acc[b.type].push(b);
                        return acc;
                    }, {} as Record<string, ResumeBlock[]>);

                    const usedIndices: Record<string, number> = {};
                    const merged = extracted.map(parsed => {
                        const type = parsed.type as BlockType;
                        const index = usedIndices[type] || 0;
                        usedIndices[type] = index + 1;

                        if (byType[type] && byType[type][index]) {
                            const existing = byType[type][index];
                            return {
                                ...existing,
                                data: { ...existing.data, ...parsed.data }
                            };
                        } else {
                            return {
                                id: Math.random().toString(36).substring(7),
                                type,
                                position: { x: 0, y: 0 },
                                data: parsed.data || {},
                                enabled: true
                            } as ResumeBlock;
                        }
                    });

                    const preserveTypes = ['summary', 'other'];
                    const preserved = newBlocks.filter(b => preserveTypes.includes(b.type));
                    setBlocks([...preserved, ...merged]);
                }
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [fullLatex, previewMode, setBlocks]);

    // 3. Sync persistence logic
    const syncToCloud = async (isManual = false) => {
        if (!blocks.length && !fullLatex) return;
        if (!token && !isLocalMode) return;
        
        try {
            setIsSaving(true);
            const currentResume = resumes[activeResumeIndex];
            const currentId = currentResume?.id;
            const resumeTitle = currentResume?.title || `Resume R_${activeResumeIndex + 1}`;
            
            const url = `${(import.meta as any).env.VITE_API_URL || '/api/v1'}/resumes`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    id: currentId,
                    title: resumeTitle,
                    canvasData: {
                        nodes: blocks,
                        customTemplate,
                        fullLatex
                    }
                })
            });

            if (response.ok) {
                const saved = await response.json();
                if (!currentId && saved.id) {
                    setResumeId(activeResumeIndex, saved.id);
                }
                if (isManual) {
                    console.log("[LOG_APP] Manual sync successful");
                }
            }
        } catch (error) {
            console.error("Sync error:", error);
        } finally {
            setIsSaving(false);
        }
    }

    const hasTriggeredOnboarding = React.useRef(false);
    React.useEffect(() => {
        const timer = setTimeout(() => syncToCloud(), 3000);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [blocks, fullLatex, customTemplate, token, activeResumeIndex]);

    // Deletion wrap with cloud action
    const handleDeleteResume = async (idx: number) => {
        const resumeToDelete = resumes[idx];
        if (resumeToDelete?.id && token) {
            try {
                const url = `${(import.meta as any).env.VITE_API_URL || '/api/v1'}/resumes/${resumeToDelete.id}`;
                const res = await fetch(url, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) console.warn("[LOG_APP] Cloud deletion failed, proceed with local only");
            } catch (e) {
                console.error("[LOG_APP] DB deletion error:", e);
            }
        }
        deleteResume(idx);
    };

    // 4. Onboarding check
    React.useEffect(() => {
        if (hasTriggeredOnboarding.current || viewState !== 'canvas') return;
        const hasHeader = blocks.some(b => b.type === 'header');
        if (!hasHeader && !isAssembling) {
            setIsOnboardingOpen(true);
            hasTriggeredOnboarding.current = true;
        }
    }, [blocks, isAssembling, viewState]);

    // 5. Dark Mode logic
    React.useEffect(() => {
        if (isDark) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    }, [isDark]);

    // 6. Index reset logic
    React.useEffect(() => {
        setPdfUrl(null);
        setCompilationLog(null);
    }, [activeResumeIndex]);

    // 7. Local vs Cloud navigation
    React.useEffect(() => {
        if (isLocalMode && viewState !== 'canvas') {
            setViewState('canvas');
        }
    }, [isLocalMode, viewState, setViewState]);

    const blockButtons: { type: BlockType; label: string; icon: any }[] = [
        { type: 'header', label: 'Header', icon: User },
        { type: 'summary', label: 'Summary', icon: FileText },
        { type: 'experience', label: 'Experience', icon: Briefcase },
        { type: 'education', label: 'Education', icon: GraduationCap },
        { type: 'skills', label: 'Skills', icon: Code },
        { type: 'project', label: 'Project', icon: Rocket },
        { type: 'other', label: 'Other', icon: Layers },
    ];

    const handleManualAssemble = () => {
        const latex = manualLatexGenerator.generate(blocks);
        setFullLatex(latex);
        setPdfUrl(null);
        setShowBuildOutput(true);
        setPreviewMode('pdf');
        downloadPdf(false);
    };

    const handleAssemble = async () => {
        setIsAssembling(true);
        setShowBuildOutput(true);
        setPreviewMode('code');
        try {
            const sectionContent = await geminiService.assembleFullResume(blocks, customTemplate || '', apiKey);
            const headerData = blocks.find(b => b.type === 'header')?.data || {};
            const fullDoc = manualLatexGenerator.generatePreamble(headerData) +
                sectionContent +
                manualLatexGenerator.generatePostamble();
            setFullLatex(fullDoc);
            setPdfUrl(null);
            downloadPdf(false);
        } catch (error) {
            console.error("Assembly Error:", error);
            alert("Failed to assemble resume. Check your API key.");
        } finally {
            setIsAssembling(false);
        }
    };

    const downloadPdf = async (shouldDownload = true) => {
        setIsGeneratingPdf(true);
        setCompilationLog(null);
        try {
            let content = fullLatex;
            if (!content) {
                content = manualLatexGenerator.generate(blocks);
                setFullLatex(content);
            }
            const blob = await latexServerService.compileLatexToPdf(content);
            const url = URL.createObjectURL(blob);
            setPdfUrl(url);
            setPreviewMode('pdf');
            if (shouldDownload) {
                const link = document.createElement('a');
                link.href = url;
                link.download = 'resume.pdf';
                link.click();
            }
        } catch (error: any) {
            console.error("PDF Gen Error:", error);
            setCompilationLog(error.message);
            setPreviewMode('pdf');
            setShowBuildOutput(true);
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const downloadTex = () => {
        const content = fullLatex || manualLatexGenerator.generate(blocks);
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'resume.tex';
        link.click();
        URL.revokeObjectURL(url);
    };

    if (!isLocalMode && viewState === 'landing' && !token) {
        return <Landing onGetStarted={() => setViewState('auth')} />;
    }

    if (!isLocalMode && viewState === 'auth' && !token) {
        return <Auth onBack={() => setViewState('landing')} onSuccess={() => setViewState('canvas')} />;
    }

    return (
        <div className="h-screen h-[100dvh] w-screen flex flex-col bg-white dark:bg-[#111215] overflow-hidden font-mono selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
            <header className="h-10 sm:h-12 border-b border-zinc-200 dark:border-[#2d3042] bg-white dark:bg-[#1e2028] flex items-center justify-between px-2 sm:px-4 z-20 shrink-0">
                <div className="flex items-center gap-2 sm:gap-6">
                    <div className="flex items-center gap-1.5 sm:gap-2 mr-2">
                        <Terminal size={12} className="text-black dark:text-white" />
                        <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-black dark:text-white whitespace-nowrap">
                            ResumeForge<span className="hidden sm:inline">.core</span>
                        </span>
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setShowProfile(!showProfile)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${showProfile
                                ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                                : 'border-zinc-200 dark:border-[#2d3042] text-zinc-500 hover:border-zinc-400 dark:hover:border-zinc-500'
                                }`}
                        >
                            <User size={12} />
                            <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">
                                {isLocalMode ? 'Sign_In' : (userEmail?.split('@')[0] || 'User')}
                            </span>
                            <ChevronDown size={10} className={`transition-transform duration-200 ${showProfile ? 'rotate-180' : ''}`} />
                        </button>

                        {showProfile && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />
                                <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-[#1e2028] border border-zinc-200 dark:border-[#2d3042] p-2 z-50 shadow-2xl rounded-lg animate-in fade-in slide-in-from-top-1">
                                    <div className="p-3 border-b border-zinc-100 dark:border-[#2d3042] mb-1">
                                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Identity_Status</p>
                                        <p className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 truncate italic">{isLocalMode ? 'Guest_Developer' : (userEmail || 'Active_Session')}</p>
                                    </div>
                                    <button 
                                        onClick={() => { syncToCloud(true); setShowProfile(false); }} 
                                        className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-md transition-all"
                                    >
                                        <RefreshCw size={12} className={isSaving ? "animate-spin" : ""} /> Sync with Cloud
                                    </button>
                                    <button onClick={() => { if (confirm("Sign out?")) logout(); }} className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-md transition-all">
                                        <LogOut size={12} /> {isLocalMode ? 'Exit Local' : 'Terminate Session'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="hidden lg:block w-px h-4 bg-zinc-200 dark:bg-zinc-800"></div>

                    <div className="flex gap-1 bg-zinc-100 dark:bg-[#111215] p-0.5 sm:p-1 border border-zinc-200 dark:border-[#2d3042] rounded-full overflow-x-auto max-w-[120px] sm:max-w-none no-scrollbar">
                        {resumes.map((r, idx) => (
                            <div key={idx} className="relative group/pill flex items-center shrink-0">
                                <button
                                    onClick={() => switchResume(idx)}
                                    className={`px-3 py-0.5 sm:py-1 text-[8px] sm:text-[9px] font-bold uppercase tracking-widest transition-all rounded-full ${activeResumeIndex === idx
                                        ? 'bg-black text-white dark:bg-white dark:text-black shadow'
                                        : 'text-zinc-400 hover:text-black dark:hover:text-white'
                                        }`}
                                >
                                    R_{idx + 1}
                                </button>
                                {resumes.length > 1 && (idx === activeResumeIndex) && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm(`Delete Resume?`)) handleDeleteResume(idx);
                                        }}
                                        className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-red-100 dark:hover:bg-red-900/40 text-red-500 ml-1"
                                    >
                                        <X size={8} />
                                    </button>
                                )}
                            </div>
                        ))}
                        <button onClick={() => addResume()} className="px-2 py-0.5 sm:py-1 text-[9px] font-bold text-zinc-400 hover:text-black dark:hover:text-white shrink-0"><Plus size={10} /></button>
                    </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-4">
                    <div className="hidden lg:flex items-center gap-4">
                        {isSaving && <div className="flex items-center gap-2 text-[8px] font-bold text-zinc-400 uppercase tracking-widest animate-pulse"><Cloud size={10} /> Syncing...</div>}
                        <button onClick={() => setIsDark(!isDark)} className="text-zinc-400 hover:text-black dark:hover:text-white p-1" title="Toggle Theme">
                            {isDark ? <Sun size={14} /> : <Moon size={14} />}
                        </button>
                    </div>

                    <div className="flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 p-0.5 sm:p-1">
                        <button
                            onClick={handleManualAssemble}
                            className="hidden sm:flex px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em] border border-black dark:border-white text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all items-center gap-2"
                        >
                            <Sparkles size={10} />
                            COMPILE
                        </button>
                        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden p-1.5 text-zinc-500 hover:text-black dark:hover:text-white"><Menu size={16} /></button>
                    </div>
                </div>
            </header>

            <div className="flex flex-1 flex-col sm:flex-row relative overflow-hidden">
                <aside className="w-full sm:w-16 h-14 sm:h-auto border-b sm:border-b-0 sm:border-r border-zinc-200 dark:border-[#2d3042] bg-white/95 dark:bg-[#1e2028]/95 backdrop-blur-md flex sm:flex-col items-center justify-start sm:justify-start py-2 sm:py-6 gap-2 sm:gap-8 z-10 shrink-0 shadow px-4 sm:px-0 overflow-x-auto no-scrollbar">
                    {blockButtons.map(({ type, icon: Icon }) => (
                        <button key={type} onClick={() => addBlock(type)} className="group relative flex flex-col items-center gap-1 text-zinc-400 dark:text-zinc-500 hover:text-black dark:hover:text-zinc-100 transition-all font-bold shrink-0">
                            <div className="w-10 h-10 rounded-lg border border-zinc-100 dark:border-[#2d3042] flex items-center justify-center group-hover:border-black dark:group-hover:border-zinc-500 transition-all"><Icon size={16} strokeWidth={1.5} /></div>
                        </button>
                    ))}
                </aside>

                <main className="flex-1 relative overflow-hidden">
                    <ResumeCanvas />
                    {showBuildOutput && (
                        <div className="absolute inset-0 z-50 bg-white dark:bg-black flex flex-col animate-in fade-in duration-300">
                            <header className="h-12 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-2 sm:px-6">
                                <div className="flex items-center gap-2 sm:gap-8">
                                    <h2 className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">Compiler_Output</h2>
                                    <div className="flex border border-zinc-100 dark:border-zinc-800 p-0.5">
                                        <button onClick={() => setPreviewMode('code')} className={`px-2 sm:px-4 py-1.5 text-[8px] sm:text-[9px] font-bold uppercase tracking-widest ${previewMode === 'code' ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-zinc-400'}`}>Source</button>
                                        <button onClick={() => { if (!pdfUrl) downloadPdf(false); else setPreviewMode('pdf'); }} className={`px-2 sm:px-4 py-1.5 text-[8px] sm:text-[9px] font-bold uppercase tracking-widest ${previewMode === 'pdf' ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-zinc-400'}`}>Preview</button>
                                    </div>
                                </div>
                                <button onClick={() => setShowBuildOutput(false)} className="text-zinc-400 hover:text-black p-1"><X size={16} /></button>
                            </header>
                            <div className="flex-1 overflow-hidden p-2 sm:p-12 bg-zinc-50 dark:bg-zinc-950 flex justify-center">
                                <div className="w-full max-w-5xl bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 flex flex-col shadow-2xl overflow-hidden text-[13px]">
                                    {previewMode === 'code' ? (
                                        <textarea className="flex-1 p-8 font-mono bg-transparent resize-none outline-none text-zinc-800 dark:text-zinc-300" value={fullLatex || ''} onChange={(e) => setFullLatex(e.target.value)} spellCheck={false} />
                                    ) : (
                                        <div className="flex-1 relative bg-zinc-100 flex items-center justify-center">
                                            {isGeneratingPdf ? <Loader2 size={24} className="animate-spin" /> : pdfUrl ? <iframe src={pdfUrl} className="w-full h-full" title="PDF" /> : compilationLog ? <pre className="p-8 text-red-500">{compilationLog}</pre> : null}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
            <OnboardingModal isOpen={isOnboardingOpen} onClose={() => setIsOnboardingOpen(false)} />
        </div>
    );
}

export default App;

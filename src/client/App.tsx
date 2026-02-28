import React, { memo, useState, useEffect } from 'react';
import { ResumeCanvas } from './components/builder/ResumeCanvas';
import { useResumeActions } from './hooks/useResume';
import {
    Plus, Settings as SettingsIcon, Layout, Sun, Moon,
    Briefcase, GraduationCap, Code, Rocket, FileText, Layers,
    Loader2, Sparkles, X, Terminal, Copy, User, Download, LogOut, Cloud, Trash2, Menu, ChevronDown, Map, Save, Key
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
        setResumeId
    } = useResumeActions();
    const [isSaving, setIsSaving] = useState(false);
    const [isDark, setIsDark] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
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
    }, [fullLatex, previewMode, setBlocks, blocks]);

    const hasTriggeredOnboarding = React.useRef(false);

    React.useEffect(() => {
        if (!blocks.length && !fullLatex) return;
        if (!token && !isLocalMode) return;

        const timer = setTimeout(async () => {
            try {
                setIsSaving(true);
                const currentId = resumes[activeResumeIndex]?.id;
                const url = `${(import.meta as any).env.VITE_API_URL || '/api/v1'}/resumes`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify({
                        id: currentId,
                        title: `Resume R_${activeResumeIndex + 1}`,
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
                }
            } catch (error) {
                console.error("Auto-sync error:", error);
            } finally {
                setIsSaving(false);
            }
        }, 3000);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [blocks, fullLatex, customTemplate]);

    React.useEffect(() => {
        if (hasTriggeredOnboarding.current || viewState !== 'canvas') return;
        const hasHeader = blocks.some(b => b.type === 'header');
        if (!hasHeader && !isAssembling) {
            setIsOnboardingOpen(true);
            hasTriggeredOnboarding.current = true;
        }
    }, [blocks, isAssembling, viewState]);

    React.useEffect(() => {
        if (isDark) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    }, [isDark]);

    React.useEffect(() => {
        setPdfUrl(null);
        setCompilationLog(null);
    }, [activeResumeIndex]);

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
                                {isLocalMode ? 'Sign_In' : 'Profile'}
                            </span>
                            <ChevronDown size={10} className={`transition-transform duration-200 ${showProfile ? 'rotate-180' : ''}`} />
                        </button>

                        {showProfile && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />
                                <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-[#1e2028] border border-zinc-200 dark:border-[#2d3042] p-2 z-50 shadow-2xl rounded-lg animate-in fade-in slide-in-from-top-1">
                                    <div className="p-3 border-b border-zinc-100 dark:border-[#2d3042] mb-1">
                                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Identity_Status</p>
                                        <p className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 truncate italic">{isLocalMode ? 'Guest_Developer' : 'Active_Session'}</p>
                                    </div>
                                    {isLocalMode && (
                                        <button onClick={() => { window.location.href = 'https://resumeforge-6aue.onrender.com/'; }} className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-md transition-all">
                                            <Cloud size={12} /> Switch to Cloud
                                        </button>
                                    )}
                                    <button onClick={() => {
                                        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ blocks, fullLatex }));
                                        const downloadAnchorNode = document.createElement('a');
                                        downloadAnchorNode.setAttribute("href", dataStr);
                                        downloadAnchorNode.setAttribute("download", "resumeforge_export.json");
                                        document.body.appendChild(downloadAnchorNode);
                                        downloadAnchorNode.click();
                                        downloadAnchorNode.remove();
                                        setShowProfile(false);
                                    }} className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-black dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-white/5 rounded-md transition-all">
                                        <Download size={12} /> Export Data
                                    </button>
                                    <button onClick={() => {
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.accept = 'application/json';
                                        input.onchange = (e) => {
                                            const file = (e.target as HTMLInputElement).files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.readAsText(file, "UTF-8");
                                                reader.onload = (readerEvent) => {
                                                    try {
                                                        const content = JSON.parse(readerEvent.target?.result as string);
                                                        if (content.blocks) setBlocks(content.blocks);
                                                        if (content.fullLatex !== undefined) setFullLatex(content.fullLatex);
                                                        alert("Import successful. Canvas synced.");
                                                    } catch (ex) { alert("Invalid JSON file"); }
                                                }
                                            }
                                        };
                                        input.click();
                                        setShowProfile(false);
                                    }} className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-black dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-white/5 rounded-md transition-all">
                                        <FileText size={12} /> Import Data
                                    </button>
                                    <div className="h-px bg-zinc-100 dark:bg-[#2d3042] my-1"></div>
                                    <button onClick={() => { if (confirm("Sign out?")) logout(); }} className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-md transition-all">
                                        <LogOut size={12} /> {isLocalMode ? 'Exit Local' : 'Terminate Session'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="hidden lg:block w-px h-4 bg-zinc-200 dark:bg-zinc-800"></div>

                    <div className="flex gap-1 bg-zinc-100 dark:bg-[#111215] p-0.5 sm:p-1 border border-zinc-200 dark:border-[#2d3042] rounded-full overflow-x-auto max-w-[120px] sm:max-w-none no-scrollbar">
                        {resumes.map((_, idx) => (
                            <div key={idx} className="relative group/pill flex items-center shrink-0">
                                <button
                                    onClick={() => switchResume(idx)}
                                    className={`px-2 sm:pl-3 sm:pr-2 py-0.5 sm:py-1 text-[8px] sm:text-[9px] font-bold uppercase tracking-widest transition-all rounded-full ${activeResumeIndex === idx
                                        ? 'bg-black text-white dark:bg-white dark:text-black shadow'
                                        : 'text-zinc-400 hover:text-black dark:hover:text-white'
                                        }`}
                                >
                                    R_{idx + 1}
                                </button>
                                {resumes.length > 1 && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm(`Delete Resume R_${idx + 1}?`)) deleteResume(idx);
                                        }}
                                        className="hidden sm:flex opacity-0 group-hover/pill:opacity-100 transition-opacity w-3 h-3 sm:w-4 sm:h-4 items-center justify-center rounded-full hover:bg-red-100 dark:hover:bg-red-900/40 text-zinc-400 hover:text-red-500 mr-1"
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
                        <button onClick={() => setIsDark(!isDark)} className="text-zinc-400 hover:text-black dark:hover:text-white p-1" title="Toggle Theme">
                            {isDark ? <Sun size={14} /> : <Moon size={14} />}
                        </button>
                        <button onClick={() => setIsOnboardingOpen(true)} className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-black dark:hover:text-white transition-colors flex items-center gap-2">
                            <User size={12} /> Import
                        </button>
                        <button onClick={() => { if (confirm("Clear canvas?")) { setBlocks([]); setFullLatex(null); } }} className="text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-600 transition-colors flex items-center gap-2">
                            <Trash2 size={12} /> Clear
                        </button>
                    </div>

                    <div className="flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 p-0.5 sm:p-1">
                        <button
                            onClick={() => {
                                if (!fullLatex) {
                                    const latex = manualLatexGenerator.generate(blocks);
                                    setFullLatex(latex);
                                }
                                setPreviewMode('code');
                                setShowBuildOutput(true);
                            }}
                            className={`hidden sm:flex px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em] border border-black dark:border-white transition-all items-center gap-2 ${fullLatex && previewMode === 'code' && showBuildOutput ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black'}`}
                        >
                            <Code size={10} />
                            EDITOR
                        </button>

                        <button
                            onClick={handleManualAssemble}
                            className="hidden sm:flex px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em] border border-black dark:border-white text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all items-center gap-2"
                        >
                            <Sparkles size={10} />
                            SYNC & COMPILE
                        </button>
                        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden p-1.5 text-zinc-500 hover:text-black dark:hover:text-white"><Menu size={16} /></button>
                    </div>
                </div>

                {isMobileMenuOpen && (
                    <div className="lg:hidden fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="absolute top-0 right-0 h-full w-64 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col p-6 animate-in slide-in-from-right duration-300">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-[10px] font-black uppercase tracking-[0.3em]">RESUMEFORGE</h2>
                                <button onClick={() => setIsMobileMenuOpen(false)} className="text-zinc-500"><X size={18} /></button>
                            </div>
                            <div className="flex flex-col gap-6">
                                <button onClick={() => { setIsOnboardingOpen(true); setIsMobileMenuOpen(false); }} className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500"><User size={14} /> Import Data</button>
                                <button onClick={() => { if (confirm("Clear canvas?")) { setBlocks([]); setFullLatex(null); } setIsMobileMenuOpen(false); }} className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-red-500"><Trash2 size={14} /> Clear Canvas</button>
                                <button onClick={handleManualAssemble} className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500"><Layout size={14} /> Offline Compile</button>
                            </div>
                        </div>
                    </div>
                )}
            </header>

            <div className="flex flex-1 flex-col sm:flex-row relative overflow-hidden">
                <aside className="w-full sm:w-16 h-14 sm:h-auto border-b sm:border-b-0 sm:border-r border-zinc-200 dark:border-[#2d3042] bg-white/95 dark:bg-[#1e2028]/95 backdrop-blur-md flex sm:flex-col items-center justify-start sm:justify-start py-2 sm:py-6 gap-2 sm:gap-8 z-10 shrink-0 shadow-[0_4px_12px_rgba(0,0,0,0.05)] dark:shadow-none px-4 sm:px-0 overflow-x-auto no-scrollbar">
                    {blockButtons.map(({ type, label, icon: Icon }) => (
                        <button key={type} onClick={() => addBlock(type)} className="group relative flex flex-col items-center gap-1 sm:gap-2 text-zinc-400 dark:text-zinc-500 hover:text-black dark:hover:text-zinc-100 transition-all font-bold shrink-0" title={label}>
                            <div className="w-10 h-10 rounded-lg border border-zinc-100 dark:border-[#2d3042] flex items-center justify-center group-hover:border-black dark:group-hover:border-zinc-500 group-hover:bg-zinc-50 dark:group-hover:bg-[#2d3042] transition-all"><Icon size={16} strokeWidth={1.5} /></div>
                        </button>
                    ))}
                </aside>

                <main className="flex-1 relative overflow-hidden">
                    <ResumeCanvas />
                    {showBuildOutput && (
                        <div className="absolute inset-0 z-50 bg-white dark:bg-black flex flex-col animate-in fade-in duration-300">
                            <header className="h-12 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-2 sm:px-6">
                                <div className="flex items-center gap-2 sm:gap-8">
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <div className="w-2 h-2 rounded-full bg-black dark:bg-white animate-pulse"></div>
                                        <h2 className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">Build_Output</h2>
                                    </div>
                                    <div className="flex border border-zinc-100 dark:border-zinc-800 p-0.5">
                                        <button onClick={() => setPreviewMode('code')} className={`px-2 sm:px-4 py-1 sm:py-1.5 text-[8px] sm:text-[9px] font-bold uppercase tracking-widest transition-all ${previewMode === 'code' ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-zinc-400'}`}>Source</button>
                                        <button onClick={() => { if (!pdfUrl) downloadPdf(false); else setPreviewMode('pdf'); }} className={`px-2 sm:px-4 py-1 sm:py-1.5 text-[8px] sm:text-[9px] font-bold uppercase tracking-widest transition-all ${previewMode === 'pdf' ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-zinc-400'}`}>Preview</button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 sm:gap-4">
                                    <button
                                        onClick={() => {
                                            if (fullLatex) {
                                                navigator.clipboard.writeText(fullLatex);
                                                alert("Copied.");
                                            }
                                        }}
                                        className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 hover:text-black flex items-center gap-1 sm:gap-2 px-1"
                                    >
                                        <Copy size={12} /> <span className="hidden sm:inline">Copy</span>
                                    </button>
                                    <button
                                        onClick={() => downloadPdf(true)}
                                        disabled={isGeneratingPdf}
                                        className="bg-black text-white dark:bg-white dark:text-black px-2 sm:px-4 py-1 sm:py-2 text-[8px] sm:text-[9px] font-bold uppercase tracking-widest hover:opacity-80 disabled:opacity-30 flex items-center gap-1 sm:gap-2"
                                    >
                                        {isGeneratingPdf ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
                                        <span className="hidden sm:inline">{isGeneratingPdf ? "COMPILING..." : "EXP_PDF"}</span>
                                        <span className="sm:hidden">{isGeneratingPdf ? "..." : "PDF"}</span>
                                    </button>
                                    <button
                                        onClick={downloadTex}
                                        className="flex items-center gap-1 px-2 py-1 text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-zinc-500 hover:text-black transition-all"
                                    >
                                        <Download size={12} /> <span className="hidden sm:inline">.TEX</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowBuildOutput(false);
                                            setFullLatex(null);
                                            setPdfUrl(null);
                                        }}
                                        className="text-zinc-400 hover:text-black p-1"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </header>
                            <div className="flex-1 overflow-hidden p-2 sm:p-12 bg-zinc-50 dark:bg-zinc-950 flex justify-center">
                                <div className="w-full max-w-5xl bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 flex flex-col shadow-2xl overflow-hidden">
                                    {previewMode === 'code' ? (
                                        <textarea className="flex-1 p-4 sm:p-12 text-[13px] sm:text-[14px] font-mono overflow-auto leading-relaxed text-zinc-800 dark:text-zinc-300 bg-transparent resize-none outline-none w-full h-full" value={fullLatex || ''} onChange={(e) => setFullLatex(e.target.value)} spellCheck={false} />
                                    ) : (
                                        <div className="flex-1 relative bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
                                            {isGeneratingPdf ? (
                                                <div className="flex flex-col items-center gap-4">
                                                    <Loader2 size={24} className="animate-spin text-black dark:text-white" /><p className="text-[8px] font-bold tracking-[0.4em] uppercase text-black dark:text-white">System.Compiling</p>
                                                </div>
                                            ) : pdfUrl ? (
                                                <iframe src={pdfUrl || undefined} className="w-full h-full border-none" title="PDF" />
                                            ) : compilationLog ? (
                                                <div className="flex-1 w-full p-4 sm:p-8 overflow-auto font-mono text-[9px] sm:text-[10px] text-red-500 bg-zinc-50 dark:bg-zinc-900">
                                                    <p className="font-bold mb-4 uppercase tracking-widest underline">Critical Compilation Error</p>
                                                    <pre className="whitespace-pre-wrap">{compilationLog}</pre>
                                                </div>
                                            ) : null}
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

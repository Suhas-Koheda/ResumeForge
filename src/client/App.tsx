import React, { memo, useState, useEffect } from 'react';
import { ResumeCanvas } from './components/builder/ResumeCanvas';
import { useResumeActions } from './hooks/useResume';
import {
    Plus, Settings as SettingsIcon, Layout, Sun, Moon,
    Briefcase, GraduationCap, Code, Rocket, FileText, Layers,
    Loader2, Sparkles, X, Terminal, Copy, User, Download, LogOut, Cloud, Trash2, Menu, ChevronDown, Map, Save, Key, RefreshCw, FileUp, FileDown, Type
} from 'lucide-react';
import { ResumeBlock, BlockType } from '@shared/types';
import { OnboardingModal } from './components/ui/OnboardingModal';
import { Landing } from './components/ui/Landing';
import { Auth } from './components/ui/Auth';
import { geminiService } from './services/ai';
import { manualLatexGenerator } from './services/manualLatex';
import { latexServerService } from './services/latex';
import { offlineLatexParser } from './services/offlineParser';
import toast, { Toaster } from 'react-hot-toast';
import { TemplateSelector } from './components/template/TemplateSelector';
import { TemplateCustomizer } from './components/template/TemplateCustomizer';
import { TemplateSaver } from './components/template/TemplateSaver';
import { latexGenerator } from './services/latexGenerator';

function App() {
    const {
        addBlock, apiKey, setApiKey, blocks,
        customTemplate, setCustomTemplate,
        activeResumeIndex, switchResume, addResume, deleteResume, resumes,
        fullLatex, setFullLatex,
        viewState, setViewState,
        token, logout, setToken, setBlocks,
        setResumeId, loadResumes, userEmail,
        templateOptions
    } = useResumeActions();

    const [isSaving, setIsSaving] = useState(false);
    const [isDark, setIsDark] = useState(false);
    const [isAssembling, setIsAssembling] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [previewMode, setPreviewMode] = useState<'code' | 'pdf' | 'template' | 'forge'>('pdf');
    const [showBuildOutput, setShowBuildOutput] = useState(false);
    const [compilationLog, setCompilationLog] = useState<string | null>(null);
    const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
    const [isLocalMode] = useState(() => {
        return (import.meta as any).env.VITE_IS_LOCAL === 'true' || (import.meta as any).env.IS_LOCAL === 'true';
    });
    const [showProfile, setShowProfile] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [hasLoadedFromServer, setHasLoadedFromServer] = useState(false);
    const [userTemplates, setUserTemplates] = useState<{ id: string, title: string, content: string }[]>([]);
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);
    const isSyncInProgress = React.useRef(false);

    // 0. Auto-bypass local mode on startup for seamless LAN experience
    useEffect(() => {
        if (isLocalMode && (viewState !== 'canvas')) {
            console.log("[LOG_APP] Local dev mode detected. Forcing canvas access...");
            if (!token) {
                setToken('local-bypass', 'local-host@dev.local');
            }
            setViewState('canvas');
        }
    }, [isLocalMode, token, setToken, setViewState, viewState]);

    // 1. Init: Fetch resumes from backend when token becomes available (login)
    useEffect(() => {
        if (token && viewState === 'canvas') {
            const fetchResumes = async () => {
                try {
                    console.log("[LOG_APP] Syncing with local SQLite...");
                    const url = `${(import.meta as any).env.VITE_API_URL || '/api/v1'}/resumes`;
                    const response = await fetch(url, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (response.ok) {
                        const data = await response.json();
                        console.log(`[LOG_APP] Successfully pulled ${data.length} resumes from SQLite`);
                        loadResumes(data);
                        setHasLoadedFromServer(true);
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

        // CRITICAL FOR LOCAL SYNC: Skip auto-syncing if we are in local mode
        // but haven't successfully pulled from the SQLite server yet.
        // This prevents the local device (mobile) from overwriting 
        // the server with its empty/stale localStorage on first load.
        if (isLocalMode && !hasLoadedFromServer && !isManual) {
            console.log("[LOG_APP] Delaying sync until SQLite pull completes...");
            return;
        }

        if (isSyncInProgress.current && !isManual) return;

        try {
            isSyncInProgress.current = true;
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
            isSyncInProgress.current = false;
        }
    }

    const fetchTemplates = async () => {
        if (!token) return;
        try {
            const url = `${(import.meta as any).env.VITE_API_URL || '/api/v1'}/templates`;
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setUserTemplates(data);
            }
        } catch (e) {
            console.error("[LOG_APP] Failed to fetch templates:", e);
        }
    };

    const saveTemplate = async () => {
        if (!token) {
            toast.error("Please log in to save templates to the cloud.");
            return;
        }
        if (!customTemplate) return;

        const title = prompt("Template Name:", `My Template ${userTemplates.length + 1}`);
        if (!title) return;

        try {
            setIsSavingTemplate(true);
            const url = `${(import.meta as any).env.VITE_API_URL || '/api/v1'}/templates`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ title, content: customTemplate })
            });

            if (response.ok) {
                toast.success("Template saved successfully.");
                fetchTemplates();
            }
        } catch (error) {
            console.error("Save template error:", error);
            toast.error("Failed to save template.");
        } finally {
            setIsSavingTemplate(false);
        }
    };

    useEffect(() => {
        if (token) fetchTemplates();
    }, [token]);

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
         const latex = previewMode === 'forge' 
             ? latexGenerator.generateFullResume(blocks, templateOptions)
             : manualLatexGenerator.generate(blocks);
         setFullLatex(latex);
         setPdfUrl(null);
         setShowBuildOutput(true);
         setPreviewMode('pdf');
         downloadPdf(false, latex);
     };

    const handleAssemble = async () => {
        setIsAssembling(true);
        setShowBuildOutput(true);
        const toastId = toast.loading("AI Assembly in progress...", { position: "bottom-center" });
        try {
            const sectionContent = await geminiService.assembleFullResume(blocks, customTemplate || '', apiKey);
            
            if (!sectionContent) {
                toast.dismiss(toastId);
                throw new Error("AI returned empty content. Please verify your API key and template.");
            }
            
            toast.success("AI Assembly complete. Compiling PDF...", { id: toastId });
            setPreviewMode('pdf');

            // Cleanup and sync
            const cleanedContent = sectionContent
                .replace(/[\u0107\u0106\u0131\u00E7\u00C7]/g, ' ') // ć, Ć, ı, ç, Ç
                .replace(/(^|\s)\]\s+([~|]|http|\\href|\\url)/g, '$1$2')
                .replace(/^\s*[\-\]]\s*$/gm, '')
                .replace(/\s+[aćçbi\u0107\u0106\u0131]\s+(?=http|\\href|\\url|~~|\|)/gi, ' ')
                .trim();

            if (cleanedContent.includes('\\documentclass') || cleanedContent.includes('\\begin{document}')) {
                setFullLatex(cleanedContent);
                downloadPdf(false, cleanedContent);
            } else {
                const headerData = blocks.find(b => b.type === 'header')?.data || {};
                const fullDoc = manualLatexGenerator.generatePreamble(headerData) +
                    cleanedContent +
                    manualLatexGenerator.generatePostamble();
                setFullLatex(fullDoc);
                downloadPdf(false, fullDoc);
            }
            pdfUrl && URL.revokeObjectURL(pdfUrl);
            setPdfUrl(null);
        } catch (error: any) {
            toast.dismiss(toastId);
            console.error("Assembly Error:", error);
            toast.error(error.message || "Failed to assemble resume. Check your API key.");
        } finally {
            setIsAssembling(false);
        }
    };

    const downloadPdf = async (shouldDownload = true, forcedContent?: string) => {
        setIsGeneratingPdf(true);
        setCompilationLog(null);
        try {
            // Sync source from visual state (Forge/PDF)
            let content = forcedContent || fullLatex || '';
            if (!forcedContent && (previewMode === 'forge' || previewMode === 'pdf' || !content)) {
                content = previewMode === 'forge'
                    ? latexGenerator.generateFullResume(blocks, templateOptions)
                    : manualLatexGenerator.generate(blocks);
                
                // Cleanup artifacts (hallucinated lone brackets and icon chars)
                content = content
                    .replace(/[\u0107\u0106\u0131\u00E7\u00C7]/g, ' ')
                    .replace(/(^|\s)\]\s+([~|]|http|\\href|\\url)/g, '$1$2')
                    .replace(/^\s*[\-\]]\s*$/gm, '')
                    .replace(/\s+[aćçbi\u0107\u0106\u0131]\s+(?=http|\\href|\\url|~~|\|)/gi, ' ');
                
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
            console.error("PDF Gen Error:", error.message);
            toast.error(`PDF Generation failed: ${error.message}`);
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

    const downloadJson = () => {
        const currentResume = resumes[activeResumeIndex];
        const exportData = {
            version: "1.0",
            source: "ResumeForge",
            timestamp: new Date().toISOString(),
            title: currentResume?.title || "My Resume",
            canvasData: {
                nodes: blocks,
                customTemplate,
                fullLatex
            }
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${(currentResume?.title || 'resume').replace(/\s+/g, '_')}.rf.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                if (json.source !== "ResumeForge") {
                    toast.error("Invalid file format. Please upload a valid ResumeForge JSON.");
                    return;
                }

                const { nodes, customTemplate: importedTemplate, fullLatex: importedLatex } = json.canvasData;

                // Update current state
                setBlocks(nodes || []);
                setCustomTemplate(importedTemplate || null);
                setFullLatex(importedLatex || null);

                toast.success("Resume imported successfully.");
            } catch (err) {
                console.error("Import error:", err);
                toast.error("Failed to parse JSON file.");
            }
        };
        reader.readAsText(file);
        // Reset input
        e.target.value = '';
    };

    if (!isLocalMode && viewState === 'landing' && !token) {
        return <Landing onGetStarted={() => setViewState('auth')} />;
    }

    if (!isLocalMode && viewState === 'auth' && !token) {
        return <Auth onBack={() => setViewState('landing')} onSuccess={() => setViewState('canvas')} />;
    }

    return (
        <div className="h-screen h-[100dvh] w-screen flex flex-col bg-white dark:bg-[#111215] text-zinc-900 dark:text-zinc-100 overflow-hidden font-mono selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
            <Toaster position="bottom-right" />
            <header className="h-10 sm:h-12 border-b border-zinc-200 dark:border-[#2d3042] bg-white dark:bg-[#1e2028] flex items-center justify-between px-2 sm:px-4 z-[60] relative shrink-0">
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
                                : 'border-zinc-200 dark:border-[#2d3042] text-zinc-500 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-300'
                                }`}
                        >
                            <User size={12} />
                            <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">
                                {isLocalMode ? 'Local_Host' : (userEmail?.split('@')[0] || 'User')}
                            </span>
                            <ChevronDown size={10} className={`transition-transform duration-200 ${showProfile ? 'rotate-180' : ''}`} />
                        </button>

                        {showProfile && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />
                                <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-[#1e2028] border border-zinc-200 dark:border-[#2d3042] p-2 z-50 shadow-2xl rounded-lg animate-in fade-in slide-in-from-top-1">
                                    <div className="p-3 border-b border-zinc-100 dark:border-[#2d3042] mb-1">
                                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Identity_Status</p>
                                        <p className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 truncate italic">{isLocalMode ? 'Offline_Mode' : (userEmail || 'Active_Session')}</p>
                                    </div>
                                    <button
                                        onClick={() => { document.getElementById('json-import-input')?.click(); setShowProfile(false); }}
                                        className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/10 rounded-md transition-all text-left"
                                    >
                                        <Download size={12} className="rotate-180" /> Import JSON Data
                                    </button>
                                    {!isLocalMode && (
                                        <button
                                            onClick={() => { syncToCloud(true); setShowProfile(false); }}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-md transition-all text-left"
                                        >
                                            <RefreshCw size={12} className={isSaving ? "animate-spin" : ""} /> Sync with Cloud
                                        </button>
                                    )}
                                    <button onClick={() => { if (confirm(isLocalMode ? "Exit offline mode?" : "Sign out?")) logout(); }} className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-md transition-all text-left">
                                        <LogOut size={12} /> {isLocalMode ? 'Exit Dev' : 'Terminate Session'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    <button
                        onClick={() => setIsOnboardingOpen(true)}
                        className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black hover:opacity-80 transition-all font-bold whitespace-nowrap"
                    >
                        <Sparkles size={10} className="sm:w-3 sm:h-3" />
                        <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest">INITIALISE</span>
                    </button>

                    <div className="hidden lg:block w-px h-4 bg-zinc-200 dark:bg-zinc-800"></div>

                    <div className="hidden sm:flex gap-1 bg-zinc-100 dark:bg-[#111215] p-0.5 sm:p-1 border border-zinc-200 dark:border-[#2d3042] rounded-full overflow-x-auto max-w-none no-scrollbar">
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
                        <button
                            onClick={() => {
                                // If opening the editor to show source code, 
                                // always sync from current blocks first to avoid overwriting 
                                // visual edits with stale LaTeX source.
                                if (!showBuildOutput && previewMode === 'code') {
                                    const freshLatex = manualLatexGenerator.generate(blocks);
                                    setFullLatex(freshLatex);
                                }
                                setShowBuildOutput(!showBuildOutput);
                            }}
                            className={`text-zinc-400 hover:text-black dark:hover:text-white p-1 transition-all ${showBuildOutput ? 'text-black dark:text-white' : ''}`}
                            title="Open Editor"
                        >
                            <Terminal size={14} />
                        </button>
                        <button onClick={() => setIsDark(!isDark)} className="text-zinc-400 hover:text-black dark:hover:text-white p-1" title="Toggle Theme">
                            {isDark ? <Sun size={14} /> : <Moon size={14} />}
                        </button>
                    </div>

                    <div className="flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 p-0.5 sm:p-1 relative">
                        <button
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            className="px-2 sm:px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em] bg-black dark:bg-white text-white dark:text-black hover:opacity-90 transition-all flex items-center gap-1 sm:gap-2"
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
                                        <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Download_Vector</p>
                                    </div>
                                    <button
                                        onClick={() => { downloadPdf(); setShowExportMenu(false); }}
                                        className="w-full flex items-center gap-3 px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900/20 rounded transition-all text-left"
                                    >
                                        <FileText size={12} /> Export PDF (.pdf)
                                    </button>
                                    <button
                                        onClick={() => { downloadTex(); setShowExportMenu(false); }}
                                        className="w-full flex items-center gap-3 px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900/20 rounded transition-all text-left"
                                    >
                                        <Type size={12} /> Export LaTeX (.tex)
                                    </button>
                                    <button
                                        onClick={() => { downloadJson(); setShowExportMenu(false); }}
                                        className="w-full flex items-center gap-3 px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-zinc-800 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-all text-left border-t border-zinc-100 dark:border-zinc-800 mt-1"
                                    >
                                        <Layers size={12} /> Export JSON (.rf.json)
                                    </button>
                                </div>
                            </>
                        )}

                        <button
                            onClick={handleManualAssemble}
                            className="hidden sm:flex px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em] border border-black dark:border-white text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all items-center gap-2"
                        >
                            <Sparkles size={10} />
                            COMPILE
                        </button>
                        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden p-1.5 text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white"><Menu size={16} /></button>
                    </div>
                </div>
                <input
                    id="json-import-input"
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleImportJson}
                />
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
                                         <button onClick={() => setPreviewMode('forge')} className={`px-2 sm:px-4 py-1.5 text-[8px] sm:text-[9px] font-bold uppercase tracking-widest ${previewMode === 'forge' ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-zinc-400'}`}>Forge</button>
                                         <button onClick={() => setPreviewMode('template')} className={`px-2 sm:px-4 py-1.5 text-[8px] sm:text-[9px] font-bold uppercase tracking-widest ${previewMode === 'template' ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-zinc-400'}`}>Template (AI)</button>
                                         <button onClick={() => { if (!pdfUrl) downloadPdf(false); else setPreviewMode('pdf'); }} className={`px-2 sm:px-4 py-1.5 text-[8px] sm:text-[9px] font-bold uppercase tracking-widest ${previewMode === 'pdf' ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-zinc-400'}`}>Preview</button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {previewMode === 'template' && (
                                        <button
                                            onClick={handleAssemble}
                                            disabled={isAssembling}
                                            className="px-3 py-1.5 bg-blue-600 text-white text-[9px] font-bold uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center gap-2"
                                        >
                                            {isAssembling ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                                            Apply_Template
                                        </button>
                                    )}
                                    <button onClick={() => setShowBuildOutput(false)} className="text-zinc-400 hover:text-black p-1"><X size={16} /></button>
                                </div>
                            </header>
                            <div className="flex-1 overflow-hidden p-2 sm:p-12 bg-zinc-50 dark:bg-zinc-950 flex justify-center">
                                <div className="w-full max-w-5xl bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 flex flex-col shadow-2xl overflow-hidden text-[13px]">
                                     {previewMode === 'code' ? (
                                         <textarea className="flex-1 p-8 font-mono bg-transparent resize-none outline-none text-zinc-800 dark:text-zinc-300" value={fullLatex || ''} onChange={(e) => setFullLatex(e.target.value)} spellCheck={false} />
                                     ) : previewMode === 'forge' ? (
                                         <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-zinc-900 p-6">
                                             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
                                                 <div className="lg:col-span-1 space-y-6">
                                                     <TemplateCustomizer />
                                                     <TemplateSaver />
                                                     <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl">
                                                         <h4 className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 mb-2">Pro Tip</h4>
                                                         <p className="text-[11px] text-blue-800 dark:text-blue-200 italic leading-relaxed">
                                                             The Forge uses TeX-native rendering for maximum precision. Any change here is reflected instantly in the "COMPILE" output.
                                                         </p>
                                                     </div>
                                                 </div>
                                                 <div className="lg:col-span-2">
                                                     <TemplateSelector />
                                                 </div>
                                             </div>
                                         </div>
                                     ) : previewMode === 'template' ? (
                                        <div className="flex-1 flex flex-col h-full">
                                            <div className="flex border-b border-zinc-100 dark:border-zinc-800">
                                                <div className="flex-1 p-2 flex gap-2 overflow-x-auto no-scrollbar">
                                                    {userTemplates.map(t => (
                                                        <button
                                                            key={t.id}
                                                            onClick={() => setCustomTemplate(t.content)}
                                                            className="px-3 py-1 bg-zinc-100 dark:bg-zinc-900 text-[8px] font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all whitespace-nowrap"
                                                        >
                                                            {t.title}
                                                        </button>
                                                    ))}
                                                </div>
                                                <button
                                                    onClick={saveTemplate}
                                                    disabled={isSavingTemplate || !customTemplate}
                                                    className="px-4 py-2 bg-green-600 text-white text-[9px] font-bold uppercase tracking-widest hover:bg-green-700 disabled:opacity-50"
                                                >
                                                    {isSavingTemplate ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
                                                </button>
                                            </div>
                                            <textarea
                                                className="flex-1 p-8 font-mono bg-transparent resize-none outline-none text-zinc-800 dark:text-zinc-300"
                                                placeholder="Enter your LaTeX macros or a full template with [PLACEHOLDERS]. AI will use this to generate the resume sections."
                                                value={customTemplate || ''}
                                                onChange={(e) => setCustomTemplate(e.target.value)}
                                                spellCheck={false}
                                            />
                                        </div>
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

            {/* ── Mobile Navigation Drawer ─────────────────────────────────── */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-[100] lg:hidden animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
                    <div className="absolute right-0 top-0 bottom-0 w-[280px] bg-white dark:bg-[#1e2028] border-l border-zinc-200 dark:border-[#2d3042] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="h-14 border-b border-zinc-100 dark:border-[#2d3042] flex items-center justify-between px-6">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Mobile_Toolbar</h3>
                            <button onClick={() => setIsMobileMenuOpen(false)} className="text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
                            {/* Theme Toggle */}
                            <div className="flex flex-col gap-3">
                                <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Interface_Mode</p>
                                <button onClick={() => setIsDark(!isDark)} className="w-full flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-[#2d3042]">
                                    <span className="text-[10px] font-bold uppercase tracking-widest">{isDark ? 'SITH_DARK' : 'SKY_LIGHT'}</span>
                                    {isDark ? <Moon size={16} /> : <Sun size={16} />}
                                </button>
                            </div>

                            {/* Resume Tabs (duplicated for mobile access) */}
                            <div className="flex flex-col gap-3">
                                <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Active_Registers</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {resumes.map((_, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => { switchResume(idx); setIsMobileMenuOpen(false); }}
                                            className={`p-4 rounded-xl border font-bold text-[10px] uppercase tracking-widest transition-all ${activeResumeIndex === idx ? 'bg-black text-white dark:bg-white dark:text-black border-black' : 'bg-transparent text-zinc-500 border-zinc-100 dark:border-[#2d3042]'}`}
                                        >
                                            R_{idx + 1}
                                        </button>
                                    ))}
                                    <button onClick={() => addResume()} className="p-4 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-400 flex items-center justify-center"><Plus size={16} /></button>
                                </div>
                            </div>

                            {/* Export Quick Links */}
                            <div className="flex flex-col gap-3">
                                <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Core_Functions</p>
                                <div className="flex flex-col gap-2">
                                    <button onClick={() => { downloadPdf(); setIsMobileMenuOpen(false); }} className="w-full h-12 flex items-center gap-4 px-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-[#2d3042] rounded-xl text-[10px] font-bold uppercase tracking-widest">
                                        <FileText size={16} /> Export PDF (.pdf)
                                    </button>
                                    <button onClick={() => { downloadJson(); setIsMobileMenuOpen(false); }} className="w-full h-12 flex items-center gap-4 px-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-[#2d3042] rounded-xl text-[10px] font-bold uppercase tracking-widest">
                                        <Layers size={16} /> Export JSON (.rf.json)
                                    </button>
                                    <button onClick={() => { handleManualAssemble(); setIsMobileMenuOpen(false); }} className="w-full h-12 flex items-center gap-4 px-4 bg-black dark:bg-white text-white dark:text-black rounded-xl text-[10px] font-bold uppercase tracking-widest">
                                        <Sparkles size={16} /> Compile System
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-zinc-100 dark:border-[#2d3042]">
                            <button onClick={() => { if (confirm(isLocalMode ? "Exit offline mode?" : "Sign out?")) logout(); }} className="w-full p-4 flex items-center justify-center gap-3 text-red-500 font-bold text-[10px] uppercase tracking-[0.2em] border border-red-100 dark:border-red-900/30 rounded-xl hover:bg-red-50 transition-all">
                                <LogOut size={16} /> {isLocalMode ? 'Exit Dev' : 'Logout'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;

import React, { useState, useEffect, useRef } from 'react';
import { Auth } from './components/ui/Auth';
import { Landing } from './components/ui/Landing';
import { ResumeCanvas } from './components/builder/ResumeCanvas';
import { MultiFileEditor } from './components/builder/MultiFileEditor';
import { useResumeActions } from './hooks/useResume';
import {
    Plus, Terminal, Sun, Moon,
    Briefcase, GraduationCap, Code, Rocket, FileText, Layers,
    Loader2, Sparkles, X, User, Download, Trash2, Menu, ChevronDown,
    Save, RefreshCw, FileDown, Type, Play,
} from 'lucide-react';
import { ResumeBlock, BlockType } from '@shared/types';
import { OnboardingModal } from './components/ui/OnboardingModal';
import { geminiService } from './services/ai';
import { manualLatexGenerator } from './services/manualLatex';
import { latexServerService } from './services/latex';
import { offlineLatexParser } from './services/offlineParser';
import toast, { Toaster } from 'react-hot-toast';
import { useFiles } from './hooks/useFiles';

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || '/api/v1';

// ── Block sidebar configuration ───────────────────────────────────────────────
const BLOCK_BUTTONS: { type: BlockType; label: string; icon: React.ElementType }[] = [
    { type: 'header',     label: 'Header',     icon: User },
    { type: 'summary',    label: 'Summary',    icon: FileText },
    { type: 'experience', label: 'Experience', icon: Briefcase },
    { type: 'education',  label: 'Education',  icon: GraduationCap },
    { type: 'skills',     label: 'Skills',     icon: Code },
    { type: 'project',    label: 'Project',    icon: Rocket },
    { type: 'other',      label: 'Other',      icon: Layers },
];

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
    const {
        addBlock, apiKey, setApiKey, blocks, setBlocks,
        customTemplate, setCustomTemplate,
        activeResumeIndex, switchResume, addResume, deleteResume, resumes,
        setResumeId, loadResumes, resetCanvas,
        templateOptions, projectFiles, activeFileName, updateFileContent,
        setProjectFiles, setActiveFileName, addFile, deleteFile,
        token, userEmail, setToken,
        aiProvider, setAiProvider,
    } = useResumeActions();

    // ── Local UI state ────────────────────────────────────────────────────────
    const [isDark, setIsDark] = useState(false);
    const [isAssembling, setIsAssembling] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [previewMode, setPreviewMode] = useState<'code' | 'pdf'>('pdf');
    const [showBuildOutput, setShowBuildOutput] = useState(false);
    const [compilationLog, setCompilationLog] = useState<string | null>(null);
    const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showAuth, setShowAuth] = useState(false);
    const [serverMode, setServerMode] = useState<'LOCAL' | 'CLOUD' | 'LOADING'>('LOADING');

    const isSyncInProgress = useRef(false);
    const hasTriggeredOnboarding = useRef(false);

    const [isInitialLoadFinished, setIsInitialLoadFinished] = useState(false);

    // ── Mode Detection ────────────────────────────────────────────────────────
    useEffect(() => {
        const checkMode = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/health`);
                if (res.ok) {
                    const data = await res.json();
                    setServerMode(data.mode || 'LOCAL');
                }
            } catch (e) {
                console.error('[APP] Mode check failed:', e);
                setServerMode('LOCAL'); // fallback
            }
        };
        checkMode();
    }, []);

    // ── Auto-save to SQLite ───────────────────────────────────────────────────
    const saveToServer = async (isManual = false) => {
        if (!isInitialLoadFinished && !isManual) return;
        if (blocks.length === 0 && projectFiles.length === 0) return;
        if (isSyncInProgress.current && !isManual) return;
        if (serverMode === 'CLOUD' && !token) return;

        try {
            isSyncInProgress.current = true;
            setIsSaving(true);
            const currentResume = resumes[activeResumeIndex];
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(`${API_BASE_URL}/resumes`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    id: currentResume?.id,
                    title: currentResume?.title || `Resume R_${activeResumeIndex + 1}`,
                    canvasData: { nodes: blocks, customTemplate, projectFiles, activeFileName, templateOptions },
                }),
            });
            if (res.ok) {
                const saved = await res.json();
                if (!currentResume?.id && saved.id) setResumeId(activeResumeIndex, saved.id);
                setHasUnsavedChanges(false);
                if (isManual) toast.success('Sync Successful');
            } else {
                if (isManual) toast.error('Sync Failed');
            }
        } catch (e) {
            console.error('[APP] Save error:', e);
        } finally {
            setIsSaving(false);
            isSyncInProgress.current = false;
        }
    };

    // Track changes for the manual save indicator
    useEffect(() => {
        if (!isInitialLoadFinished) return;
        setHasUnsavedChanges(true);
    }, [blocks, projectFiles, activeFileName, customTemplate, activeResumeIndex]);

    // ── Initial data load ─────────────────────────────────────────────────────
    useEffect(() => {
        if (serverMode === 'LOADING') return;
        if (serverMode === 'CLOUD' && !token) {
            setIsInitialLoadFinished(true);
            return;
        }

        const fetchResumes = async () => {
            try {
                const headers: Record<string, string> = {};
                if (token) headers['Authorization'] = `Bearer ${token}`;

                const res = await fetch(`${API_BASE_URL}/resumes`, { headers });
                if (res.ok) {
                    const data = await res.json();
                    if (data.length > 0) loadResumes(data);
                }
            } catch (e) {
                console.error('[APP] Failed to fetch resumes:', e);
            } finally {
                setIsInitialLoadFinished(true);
            }
        };
        fetchResumes();
    }, [serverMode, token]); // re-run when mode or token changes

    // ── Resume deletion ───────────────────────────────────────────────────────
    const handleDeleteResume = async (idx: number) => {
        if (serverMode === 'CLOUD' && !token) return;

        const toDelete = resumes[idx];
        if (toDelete?.id) {
            try {
                const headers: Record<string, string> = {};
                if (token) headers['Authorization'] = `Bearer ${token}`;
                const res = await fetch(`${API_BASE_URL}/resumes/${toDelete.id}`, { method: 'DELETE', headers });
                if (res.ok) {
                    toast.success('Resume Purged from DB');
                } else {
                    toast.error('DB Purge Failed');
                }
            } catch (e) {
                console.error('[APP] Delete resume error:', e);
                toast.error('Network Error during Purge');
            }
        }
        deleteResume(idx);
    };

    // ── Onboarding ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (hasTriggeredOnboarding.current) return;
        if (!blocks.some(b => b.type === 'header') && !isAssembling) {
            setIsOnboardingOpen(true);
            hasTriggeredOnboarding.current = true;
        }
    }, [blocks, isAssembling]);

    // ── Dark mode ─────────────────────────────────────────────────────────────
    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDark);
    }, [isDark]);

    // ── Reset PDF on resume switch ────────────────────────────────────────────
    useEffect(() => {
        setPdfUrl(null);
        setCompilationLog(null);
    }, [activeResumeIndex]);

    // ── PDF Compilation ───────────────────────────────────────────────────────
    async function downloadPdf(shouldDownload = true, forcedContent?: string, filename?: string) {
        setIsGeneratingPdf(true);
        setCompilationLog(null);
        try {
            const filesToCompile: { name: string, content: string, version: number, lastEditor: string, timestamp: number }[] = projectFiles.map(f => ({ 
                name: f.name, 
                content: f.content,
                version: f.version || 1,
                lastEditor: f.lastEditor || 'system',
                timestamp: f.timestamp || Date.now()
            }));

            if (forcedContent) {
                const targetName = filename || 'main.tex';
                const idx = filesToCompile.findIndex(f => f.name === targetName);
                if (idx > -1) filesToCompile[idx].content = forcedContent;
                else filesToCompile.push({ name: targetName, content: forcedContent, version: 1, lastEditor: 'system', timestamp: Date.now() });
            }

            const mainFile = filesToCompile.find(f => f.name === 'main.tex');
            if (!mainFile || mainFile.content.trim().length < 50) {
                const generated = manualLatexGenerator.generate(blocks);
                if (mainFile) mainFile.content = generated;
                else filesToCompile.push({ name: 'main.tex', content: generated, version: 1, lastEditor: 'system', timestamp: Date.now() });
            }

            if (filesToCompile.length === 0) { toast.error('No files to compile'); return; }

            const blob = await latexServerService.compileLatexToPdf(filesToCompile);
            const url = URL.createObjectURL(blob);
            setPdfUrl(url);
            setPreviewMode('pdf');

            if (shouldDownload) {
                const a = document.createElement('a');
                a.href = url;
                a.download = filename ? filename.replace(/\.tex$/, '.pdf') : 'resume.pdf';
                a.click();
            }
        } catch (err: any) {
            console.error('PDF Gen Error:', err.message);
            toast.error(`PDF Generation failed: ${err.message}`);
            setCompilationLog(err.message);
            setPreviewMode('pdf');
            setShowBuildOutput(true);
        } finally {
            setIsGeneratingPdf(false);
        }
    }

    // ── Manual assemble (blocks → LaTeX → compile) ────────────────────────────
    function handleManualAssemble(forcedLatex?: string, filename?: string, forceFromBlocks = false) {
        let latex = forcedLatex;
        
        if (!latex) {
            const mainFile = projectFiles.find(f => f.name === 'main.tex');
            if (mainFile && mainFile.content && mainFile.content.trim().length > 50) {
                latex = mainFile.content;
            } else {
                latex = manualLatexGenerator.generate(blocks);
            }
        }

        if (!forcedLatex || filename === 'main.tex') {
            updateFileContent('main.tex', latex, 'code');
        }
        setPdfUrl(null);
        setShowBuildOutput(true);
        setPreviewMode('pdf');
        downloadPdf(false, latex, filename);
    }

    // ── AI assemble ───────────────────────────────────────────────────────────
    async function handleAssemble() {
        setIsAssembling(true);
        setShowBuildOutput(true);
        const toastId = toast.loading('Syncing Canvas to Template…', { position: 'bottom-center' });
        try {
            const baseTemplate = customTemplate || projectFiles.find(f => f.name === 'main.tex')?.content || '';
            
            let finalDoc = '';
            let usedLocal = false;

            // Attempt local assembly first
            try {
                const localResult = await geminiService.assembleLocal(blocks, baseTemplate);
                if (localResult) {
                    finalDoc = localResult;
                    usedLocal = true;
                    toast.success('Local Assembly complete.', { id: toastId });
                }
            } catch (e) {
                console.warn('[APP] Local assembly failed, falling back to AI:', e);
            }

            // Fallback to AI if local assembly was not possible
            if (!usedLocal) {
                const sectionContent = await geminiService.assembleFullResume(blocks, baseTemplate);
                if (!sectionContent) {
                    toast.dismiss(toastId);
                    throw new Error('AI returned empty content. Verify your API key and template.');
                }

                toast.success('AI Assembly complete. Compiling PDF…', { id: toastId });

                const cleaned = sectionContent
                    .replace(/[\u0107\u0106\u0131\u00E7\u00C7]/g, ' ')
                    .replace(/(^|\s)\]\s+([~|]|http|\\href|\\url)/g, '$1$2')
                    .replace(/^\s*[\-\]]\s*$/gm, '')
                    .trim();

                finalDoc = cleaned;
                if (!cleaned.includes('\\documentclass') && cleaned.length > 100 && !cleaned.includes('\\begin{document}')) {
                    const headerData = blocks.find(b => b.type === 'header')?.data || {};
                    finalDoc = manualLatexGenerator.generatePreamble(headerData) + '\n' + cleaned + '\n' + manualLatexGenerator.generatePostamble();
                } else if (cleaned.length < 50) {
                    finalDoc = manualLatexGenerator.generate(blocks);
                }
            }

            updateFileContent('main.tex', finalDoc);
            if (!usedLocal) toast.success('main.tex updated in memory.');
            downloadPdf(false, finalDoc);
            
            if (pdfUrl) URL.revokeObjectURL(pdfUrl);
            setPdfUrl(null);
        } catch (err: any) {
            toast.dismiss(toastId);
            toast.error(err.message || 'Failed to assemble resume.');
        } finally {
            setIsAssembling(false);
        }
    }

    // ── Export helpers ────────────────────────────────────────────────────────
    const downloadTex = () => {
        const content = projectFiles.find(f => f.name === 'main.tex')?.content || manualLatexGenerator.generate(blocks);
        triggerDownload(content, 'resume.tex', 'text/plain');
    };

    const downloadJson = () => {
        const data = {
            version: '1.0',
            source: 'ResumeForge',
            timestamp: new Date().toISOString(),
            title: resumes[activeResumeIndex]?.title || 'My Resume',
            canvasData: { nodes: blocks, customTemplate, projectFiles, activeFileName },
        };
        const name = `${(resumes[activeResumeIndex]?.title || 'resume').replace(/\s+/g, '_')}.rf.json`;
        triggerDownload(JSON.stringify(data, null, 2), name, 'application/json');
    };

    const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const json = JSON.parse(ev.target?.result as string);
                if (json.source !== 'ResumeForge') {
                    toast.error('Invalid file format.');
                    return;
                }
                const { nodes, customTemplate: tmpl, projectFiles: pf, activeFileName: af } = json.canvasData;
                setBlocks(nodes || []);
                setCustomTemplate(tmpl || null);
                if (pf) setProjectFiles(pf);
                else if (json.canvasData.fullLatex) setProjectFiles([{ 
                    name: 'main.tex', 
                    content: json.canvasData.fullLatex,
                    version: 1,
                    lastEditor: 'system',
                    timestamp: Date.now()
                }]);
                setActiveFileName(af || 'main.tex');
                toast.success('Resume imported successfully.');
            } catch {
                toast.error('Failed to parse JSON file.');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    // ── Render ────────────────────────────────────────────────────────────────
    if (serverMode === 'LOADING') {
        return (
            <div className="h-screen w-screen bg-white dark:bg-[#111215] flex items-center justify-center font-mono">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-black dark:text-white" />
                    <p className="text-[10px] uppercase font-black tracking-widest text-zinc-400">Syncing_Nodes...</p>
                </div>
            </div>
        );
    }

    if (serverMode === 'CLOUD' && !token && !showAuth) {
        return (
            <div className="h-screen w-screen overflow-hidden">
                <Toaster position="bottom-right" />
                <Landing onGetStarted={() => setShowAuth(true)} />
            </div>
        );
    }

    return (
        <div className="h-screen h-[100dvh] w-screen flex flex-col bg-white dark:bg-[#111215] text-zinc-900 dark:text-zinc-100 overflow-hidden font-mono selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
            <Toaster position="bottom-right" />

            {/* ── Header ──────────────────────────────────────────────────── */}
            <header className="h-10 sm:h-12 border-b border-zinc-200 dark:border-[#2d3042] bg-white dark:bg-[#1e2028] flex items-center justify-between px-2 sm:px-4 z-[60] relative shrink-0">
                <div className="flex items-center gap-2 sm:gap-6">
                    {/* Logo */}
                    <div className="flex items-center gap-1.5 sm:gap-2 mr-2">
                        <Terminal size={12} className="text-black dark:text-white" />
                            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-black dark:text-white whitespace-nowrap">
                                ResumeForge<span className="hidden sm:inline">.{serverMode.toLowerCase()}</span>
                            </span>
                        </div>

                        {/* Onboarding / Auth Button */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsOnboardingOpen(true)}
                                className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black hover:opacity-80 transition-all font-bold whitespace-nowrap"
                            >
                                <Sparkles size={10} className="sm:w-3 sm:h-3" />
                                <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest">INITIALISE</span>
                            </button>

                            {serverMode === 'CLOUD' && (
                                <button
                                    onClick={() => token ? setToken(null, null) : setShowAuth(true)}
                                    className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all font-bold text-zinc-600 dark:text-zinc-400"
                                >
                                    <User size={10} className="sm:w-3 sm:h-3" />
                                    <span className="text-[8px] sm:text-[10px] uppercase font-black tracking-widest">
                                        {token ? 'LOGOUT' : 'LOGIN'}
                                    </span>
                                </button>
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
                                        onClick={(e) => { e.stopPropagation(); if (confirm('Delete Resume?')) handleDeleteResume(idx); }}
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
                                <span className="text-[8px] font-black uppercase tracking-widest">SYNC PENDING</span>
                            </button>
                        )}
                        {isSaving && (
                            <div className="flex items-center gap-2 text-[8px] font-bold text-zinc-400 uppercase tracking-widest animate-pulse">
                                <Save size={10} /> Saving…
                            </div>
                        )}
                        {!hasUnsavedChanges && !isSaving && (
                            <div className="flex items-center gap-2 text-[8px] font-bold text-emerald-500 uppercase tracking-widest opacity-60">
                                <Save size={10} /> All Synced
                            </div>
                        )}
                        <button
                            onClick={() => {
                                if (!showBuildOutput) {
                                    const freshLatex = manualLatexGenerator.generate(blocks);
                                    const mainFile = projectFiles.find(f => f.name === 'main.tex');
                                    if (!mainFile?.content || mainFile.content.trim().length < 50) {
                                        updateFileContent('main.tex', freshLatex);
                                    }
                                }
                                setShowBuildOutput(!showBuildOutput);
                            }}
                            className={`text-zinc-400 hover:text-black dark:hover:text-white p-1 transition-all ${showBuildOutput ? 'text-black dark:text-white' : ''}`}
                            title="Open Editor"
                        >
                            <Terminal size={14} />
                        </button>
                        <button
                            onClick={() => setAiProvider(aiProvider === 'gemini' ? 'ollama' : 'gemini')}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-full border transition-all font-bold ${aiProvider === 'ollama' ? 'border-purple-500 bg-purple-500/10 text-purple-500' : 'border-blue-500 bg-blue-500/10 text-blue-500'}`}
                            title={`Switch to ${aiProvider === 'gemini' ? 'Ollama' : 'Gemini'}`}
                        >
                            <Sparkles size={10} className={aiProvider === 'ollama' ? 'text-purple-500' : 'text-blue-500'} />
                            <span className="text-[8px] font-black uppercase tracking-widest">{aiProvider}</span>
                        </button>
                        <button onClick={() => setIsDark(!isDark)} className="text-zinc-400 hover:text-black dark:hover:text-white p-1" title="Toggle Theme">
                            {isDark ? <Sun size={14} /> : <Moon size={14} />}
                        </button>
                    </div>

                    {/* Export menu */}
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
                                    <DropdownBtn icon={FileText} label="Export PDF (.pdf)" onClick={() => { downloadPdf(); setShowExportMenu(false); }} />
                                    <DropdownBtn icon={Type} label="Export LaTeX (.tex)" onClick={() => { downloadTex(); setShowExportMenu(false); }} />
                                    <DropdownBtn icon={Layers} label="Export JSON (.rf.json)" onClick={() => { downloadJson(); setShowExportMenu(false); }} highlighted />
                                    
                                    <div className="p-2 border-t border-zinc-100 dark:border-[#2d3042] mt-1 mb-1">
                                        <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Inbound_Data</p>
                                    </div>
                                    <DropdownBtn icon={FileDown} label="Import JSON (.rf.json)" onClick={() => { document.getElementById('json-import-input')?.click(); setShowExportMenu(false); }} />
                                </div>
                            </>
                        )}

                        <button
                            onClick={() => handleAssemble()}
                            className="hidden sm:flex px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em] border border-black dark:border-white text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all items-center gap-2"
                        >
                            <Sparkles size={10} /> SYNC & COMPILE
                        </button>

                        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden p-1.5 text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white">
                            <Menu size={16} />
                        </button>
                    </div>
                </div>

                <input id="json-import-input" type="file" accept=".json" className="hidden" onChange={handleImportJson} />
            </header>

            {/* ── Main layout ───────────────────────────────────────────────── */}
            <div className="flex flex-1 flex-col sm:flex-row relative overflow-hidden">
                {/* Sidebar */}
                <aside className="w-full sm:w-16 h-14 sm:h-auto border-b sm:border-b-0 sm:border-r border-zinc-200 dark:border-[#2d3042] bg-white/95 dark:bg-[#1e2028]/95 backdrop-blur-md flex sm:flex-col items-center justify-start sm:justify-start py-2 sm:py-6 gap-2 sm:gap-8 z-10 shrink-0 shadow px-4 sm:px-0 overflow-x-auto no-scrollbar">
                    {BLOCK_BUTTONS.map(({ type, icon: Icon }) => (
                        <button key={type} onClick={() => addBlock(type)} className="group relative flex flex-col items-center gap-1 text-zinc-400 dark:text-zinc-500 hover:text-black dark:hover:text-zinc-100 transition-all font-bold shrink-0">
                            <div className="w-10 h-10 rounded-lg border border-zinc-100 dark:border-[#2d3042] flex items-center justify-center group-hover:border-black dark:group-hover:border-zinc-500 transition-all">
                                <Icon size={16} strokeWidth={1.5} />
                            </div>
                        </button>
                    ))}
                </aside>

                {/* Canvas */}
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
                                        <MultiFileEditor onCompile={(latex, filename) => handleManualAssemble(latex, filename)} isCompiling={isGeneratingPdf} />
                                    ) : (
                                        <div className="flex-1 relative bg-zinc-100 flex items-center justify-center">
                                            {isGeneratingPdf
                                                ? <Loader2 size={24} className="animate-spin" />
                                                : pdfUrl
                                                    ? <iframe src={pdfUrl} className="w-full h-full" title="PDF" />
                                                    : compilationLog
                                                        ? <pre className="p-8 text-red-500 overflow-auto whitespace-pre-wrap">{compilationLog}</pre>
                                                        : null}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            <OnboardingModal isOpen={isOnboardingOpen} onClose={() => setIsOnboardingOpen(false)} />

            {showAuth && (
                <div className="fixed inset-0 z-[100] bg-white dark:bg-black">
                    <Auth onBack={() => setShowAuth(false)} onSuccess={() => setShowAuth(false)} />
                </div>
            )}

            {/* ── Mobile Drawer ─────────────────────────────────────────────── */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-[100] lg:hidden animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
                    <div className="absolute right-0 top-0 bottom-0 w-[280px] bg-white dark:bg-[#1e2028] border-l border-zinc-200 dark:border-[#2d3042] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="h-14 border-b border-zinc-100 dark:border-[#2d3042] flex items-center justify-between px-6">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Mobile_Toolbar</h3>
                            <button onClick={() => setIsMobileMenuOpen(false)} className="text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white"><X size={18} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
                            {/* Theme */}
                            <div className="flex flex-col gap-3">
                                <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Interface_Mode</p>
                                <button onClick={() => setIsDark(!isDark)} className="w-full flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-[#2d3042]">
                                    <span className="text-[10px] font-bold uppercase tracking-widest">{isDark ? 'SITH_DARK' : 'SKY_LIGHT'}</span>
                                    {isDark ? <Moon size={16} /> : <Sun size={16} />}
                                </button>
                            </div>

                            {/* Resume tabs */}
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
                                    <button onClick={() => addResume()} className="p-4 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-400 flex items-center justify-center">
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Export */}
                            <div className="flex flex-col gap-3">
                                <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Core_Functions</p>
                                <div className="flex flex-col gap-2">
                                    <button onClick={() => { downloadPdf(); setIsMobileMenuOpen(false); }} className="w-full h-12 flex items-center gap-4 px-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-[#2d3042] rounded-xl text-[10px] font-bold uppercase tracking-widest">
                                        <FileText size={16} /> Export PDF
                                    </button>
                                    <button onClick={() => { downloadJson(); setIsMobileMenuOpen(false); }} className="w-full h-12 flex items-center gap-4 px-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-[#2d3042] rounded-xl text-[10px] font-bold uppercase tracking-widest">
                                        <Layers size={16} /> Export JSON
                                    </button>
                                    <button onClick={() => { handleAssemble(); setIsMobileMenuOpen(false); }} className="w-full h-12 flex items-center gap-4 px-4 bg-black dark:bg-white text-white dark:text-black rounded-xl text-[10px] font-bold uppercase tracking-widest">
                                        <Sparkles size={16} /> Sync & Compile
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Import + Reset */}
                        <div className="p-6 border-t border-zinc-100 dark:border-[#2d3042] flex flex-col gap-2">
                            <button
                                onClick={() => { document.getElementById('json-import-input')?.click(); setIsMobileMenuOpen(false); }}
                                className="w-full p-3 flex items-center justify-center gap-3 text-zinc-500 font-bold text-[10px] uppercase tracking-[0.2em] border border-zinc-100 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 transition-all"
                            >
                                <FileDown size={16} /> Import JSON
                            </button>
                            <button
                                onClick={() => { if (confirm('Reset all canvas data?')) { resetCanvas(); setIsMobileMenuOpen(false); } }}
                                className="w-full p-3 flex items-center justify-center gap-3 text-red-500 font-bold text-[10px] uppercase tracking-[0.2em] border border-red-100 dark:border-red-900/30 rounded-xl hover:bg-red-50 transition-all"
                            >
                                <Trash2 size={16} /> Reset Canvas
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function triggerDownload(content: string, filename: string, mimeType: string) {
    const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function DropdownBtn({ icon: Icon, label, onClick, highlighted = false }: {
    icon: React.ElementType; label: string; onClick: () => void; highlighted?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-3 py-2 text-[9px] font-bold uppercase tracking-widest rounded transition-all text-left ${highlighted
                ? 'text-zinc-800 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border-t border-zinc-100 dark:border-zinc-800 mt-1'
                : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900/20'}`}
        >
            <Icon size={12} /> {label}
        </button>
    );
}

export default App;

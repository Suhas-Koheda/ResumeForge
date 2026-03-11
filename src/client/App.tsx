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
    Save, RefreshCw, FileDown, Type, Play, FileCode,
} from 'lucide-react';
import { ResumeBlock, BlockType } from '@shared/types';
import { OnboardingModal } from './components/ui/OnboardingModal';
import { geminiService } from './services/ai';
import { manualLatexGenerator } from './services/manualLatex';
import { latexServerService } from './services/latex';
import { offlineLatexParser } from './services/offlineParser';
import toast, { Toaster } from 'react-hot-toast';
import { useFiles } from './hooks/useFiles';
import { BuildOutputOverlay } from './components/layout/BuildOutputOverlay';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { MobileDrawer } from './components/layout/MobileDrawer';

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || '/api/v1';

// ── Block sidebar configuration ───────────────────────────────────────────────
const BLOCK_BUTTONS: { type: BlockType; label: string; icon: React.ElementType }[] = [
    { type: 'header', label: 'Header', icon: User },
    { type: 'summary', label: 'Summary', icon: FileText },
    { type: 'experience', label: 'Experience', icon: Briefcase },
    { type: 'education', label: 'Education', icon: GraduationCap },
    { type: 'skills', label: 'Skills', icon: Code },
    { type: 'project', label: 'Project', icon: Rocket },
    { type: 'other', label: 'Other', icon: Layers },
    { type: 'template', label: 'Template', icon: FileCode },
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
    const [assembleElapsed, setAssembleElapsed] = useState(0);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [previewMode, setPreviewMode] = useState<'code' | 'pdf'>('pdf');
    const [showBuildOutput, setShowBuildOutput] = useState(false);
    const [compilationLog, setCompilationLog] = useState<string | null>(null);
    const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

    // Cache for compilation — key is blocks+template hash, value is the generated LaTeX
    const lastAssembledStateRef = useRef<string>('');
    const lastAssembledDocRef = useRef<string>('');
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
                    if (data.aiProvider) {
                        setAiProvider(data.aiProvider);
                    }
                }
            } catch (e) {
                console.error('[APP] Mode check failed:', e);
                setServerMode('LOCAL'); // fallback
            }
        };
        checkMode();

        // Auto-show Auth if token is present
        const params = new URLSearchParams(window.location.search);
        if (params.get('token') || params.get('resetToken')) {
            setShowAuth(true);
        }
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
                const errBody = await res.json().catch(() => null);
                const errMsg = errBody?.message || errBody?.error || 'Sync Failed';
                if (isManual || res.status === 403) toast.error(errMsg, { duration: 8000 });
                else if (isManual) toast.error('Sync Failed');
            }
        } catch (e) {
            console.error('[APP] Save error:', e);
        } finally {
            setIsSaving(false);
            isSyncInProgress.current = false;
        }
    };

    // Track changes for the manual save indicator
    // NOTE: only blocks+customTemplate+resumeIndex invalidate the AI cache.
    // projectFiles changes constantly (e.g. when main.tex is written after compile)
    // so we deliberately exclude it from the cache-invalidation logic.
    useEffect(() => {
        if (!isInitialLoadFinished) return;
        setHasUnsavedChanges(true);
    }, [blocks, projectFiles, activeFileName, customTemplate, activeResumeIndex]);

    // Invalidate assembly cache only when user-editable content changes
    useEffect(() => {
        if (!isInitialLoadFinished) return;
        lastAssembledStateRef.current = ''; // force re-assembly on next click
    }, [blocks, customTemplate, activeResumeIndex]);

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

    // ── Assembly elapsed timer ────────────────────────────────────────────────
    useEffect(() => {
        if (!isAssembling) { setAssembleElapsed(0); return; }
        setAssembleElapsed(0);
        const t = setInterval(() => setAssembleElapsed(s => s + 1), 1000);
        return () => clearInterval(t);
    }, [isAssembling]);

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
    async function handleAssemble(forceAi = false) {
        // Prioritize template block from canvas if it exists and is enabled
        const templateBlock = blocks.find(b => b.type === 'template' && b.enabled !== false);
        const baseTemplate = templateBlock?.data?.content || customTemplate || projectFiles.find(f => f.name === 'main.tex')?.content || '';
        // Build a cache key from only user-controlled content (blocks + base template)
        // Excluding main.tex from projectFiles because it gets overwritten every compile
        const cacheKey = JSON.stringify(blocks.filter(b => b.enabled !== false)) + '|||' + baseTemplate.slice(0, 500);

        // 🛑 Fast path: same blocks+template as last time, PDF already rendered — just show it
        if (!forceAi && lastAssembledStateRef.current === cacheKey && lastAssembledDocRef.current && pdfUrl) {
            setShowBuildOutput(true);
            setPreviewMode('pdf');
            toast.success('No changes — showing cached PDF.', { position: 'bottom-center' });
            return;
        }

        setIsAssembling(true);
        setShowBuildOutput(true);
        const toastId = toast.loading(forceAi ? 'Forcing AI Assembly…' : 'Syncing Canvas to Template…', { position: 'bottom-center' });
        try {

            let finalDoc = '';
            let usedLocal = false;

            // Attempt local assembly first WITHOUT API CALL
            if (!forceAi) {
                try {
                    const { LatexBlockManager } = await import('../shared/latexBlockManager');
                    const manager = new LatexBlockManager();
                    const localResult = manager.assembleLocal(baseTemplate, blocks);

                    if (localResult) {
                        finalDoc = localResult;
                        usedLocal = true;
                        setPreviewMode('pdf');

                        // If no custom template was used, warn the user this is a neutral layout
                        if (!baseTemplate || baseTemplate.trim().length < 50) {
                            toast.dismiss(toastId);
                            toast(
                                (t) => (
                                    <div className="flex flex-col gap-1.5 max-w-xs">
                                        <p className="text-[11px] font-black uppercase tracking-widest">Neutral Template</p>
                                        <p className="text-[10px] text-zinc-600 leading-relaxed">
                                            No custom template detected — using a basic layout. Hit{' '}
                                            <strong>AI&nbsp;Assemble</strong> (✦) or open the{' '}
                                            <strong>Source editor</strong> to apply your own template.
                                        </p>
                                        <button
                                            onClick={() => toast.dismiss(t.id)}
                                            className="self-end text-[9px] font-bold uppercase tracking-widest text-zinc-400 hover:text-black mt-0.5"
                                        >
                                            Got it
                                        </button>
                                    </div>
                                ),
                                { duration: 8000, position: 'bottom-center', icon: 'ℹ️' }
                            );
                        } else {
                            toast.success('Local Assembly complete.', { id: toastId });
                        }
                    }
                } catch (e) {
                    console.warn('[APP] Local assembly failed, falling back to AI:', e);
                }
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

            // Cache the result — store the key that produced this PDF
            lastAssembledStateRef.current = cacheKey;
            lastAssembledDocRef.current = finalDoc;

            if (!usedLocal) toast.success('main.tex updated in memory.');

            // IMPORTANT: Proactively save to server/disk so main.tex is updated
            saveToServer(false);

            if (pdfUrl) URL.revokeObjectURL(pdfUrl);
            setPdfUrl(null);
            downloadPdf(false, finalDoc);
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

            <Header
                serverMode={serverMode}
                blocks={blocks}
                setIsOnboardingOpen={setIsOnboardingOpen}
                token={token}
                userEmail={userEmail}
                setToken={setToken}
                setShowAuth={setShowAuth}
                resumes={resumes}
                activeResumeIndex={activeResumeIndex}
                switchResume={switchResume}
                handleDeleteResume={handleDeleteResume}
                addResume={addResume}
                hasUnsavedChanges={hasUnsavedChanges}
                isSaving={isSaving}
                saveToServer={saveToServer}
                showBuildOutput={showBuildOutput}
                setShowBuildOutput={setShowBuildOutput}
                projectFiles={projectFiles}
                updateFileContent={updateFileContent}
                manualLatexGenerator={manualLatexGenerator}
                aiProvider={aiProvider}
                setAiProvider={setAiProvider}
                isDark={isDark}
                setIsDark={setIsDark}
                showExportMenu={showExportMenu}
                setShowExportMenu={setShowExportMenu}
                downloadPdf={downloadPdf}
                downloadTex={downloadTex}
                downloadJson={downloadJson}
                handleAssemble={handleAssemble}
                setIsMobileMenuOpen={setIsMobileMenuOpen}
                isMobileMenuOpen={isMobileMenuOpen}
                isAssembling={isAssembling}
            />

            {/* ── Main layout ───────────────────────────────────────────────── */}
            <div className="flex flex-1 flex-col sm:flex-row relative overflow-hidden">
                <Sidebar BLOCK_BUTTONS={BLOCK_BUTTONS} addBlock={addBlock} />

                {/* Canvas */}
                <main className="flex-1 relative overflow-hidden">
                    <ResumeCanvas />
                    <BuildOutputOverlay
                        showBuildOutput={showBuildOutput}
                        setShowBuildOutput={setShowBuildOutput}
                        previewMode={previewMode}
                        setPreviewMode={setPreviewMode}
                        pdfUrl={pdfUrl}
                        isGeneratingPdf={isGeneratingPdf}
                        compilationLog={compilationLog}
                        downloadPdf={downloadPdf}
                        handleManualAssemble={handleManualAssemble}
                        MultiFileEditor={MultiFileEditor}
                        onAiAssemble={() => handleAssemble(true)}
                        isAssembling={isAssembling}
                    />
                </main>
            </div>

            <OnboardingModal 
                isOpen={isOnboardingOpen} 
                onClose={() => setIsOnboardingOpen(false)} 
                serverMode={serverMode}
            />

            {showAuth && (
                <div className="fixed inset-0 z-[100] bg-white dark:bg-black">
                    <Auth onBack={() => setShowAuth(false)} onSuccess={() => setShowAuth(false)} />
                </div>
            )}

            <MobileDrawer
                isMobileMenuOpen={isMobileMenuOpen}
                setIsMobileMenuOpen={setIsMobileMenuOpen}
                setIsDark={setIsDark}
                isDark={isDark}
                serverMode={serverMode}
                userEmail={userEmail}
                token={token}
                setToken={setToken}
                setShowAuth={setShowAuth}
                BLOCK_BUTTONS={BLOCK_BUTTONS}
                addBlock={addBlock}
            />

            {isAssembling && (
                <div className="fixed inset-0 z-[150] bg-white/80 dark:bg-black/80 backdrop-blur-md flex flex-col items-center justify-center font-mono">
                    <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-300">
                        <div className="relative">
                            <Loader2 className="w-16 h-16 animate-spin text-black dark:text-white" />
                            <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-blue-500 animate-pulse" />
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <h2 className="text-2xl font-black uppercase tracking-[0.3em]">Syncing_Nodes</h2>
                            <p className="text-[12px] font-bold text-zinc-500 uppercase tracking-widest animate-pulse">Forging Your Masterpiece...</p>
                        </div>
                        {/* Timer + estimated time */}
                        <div className="flex flex-col items-center gap-1.5">
                            <div className="flex items-center gap-3 text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                                <span className="tabular-nums">{assembleElapsed}s elapsed</span>
                                <span className="opacity-40">·</span>
                                <span>Est. ~{aiProvider === 'ollama' ? '15' : '25'}s</span>
                            </div>
                            {/* Progress bar */}
                            <div className="w-48 h-0.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-black dark:bg-white rounded-full transition-all duration-1000 ease-linear"
                                    style={{ width: `${Math.min((assembleElapsed / (aiProvider === 'ollama' ? 15 : 75)) * 100, 95)}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <input id="json-import-input" type="file" accept=".json" className="hidden" onChange={handleImportJson} />
        </div>
    );
}

function triggerDownload(content: string, filename: string, mimeType: string) {
    const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

export default App;

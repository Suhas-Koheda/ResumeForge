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
import { BuildOutputOverlay } from './components/layout/BuildOutputOverlay';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { MobileDrawer } from './components/layout/MobileDrawer';

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'api/v1';

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
                    setPreviewMode('pdf');
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
                    />
                </main>
            </div>

            <OnboardingModal isOpen={isOnboardingOpen} onClose={() => setIsOnboardingOpen(false)} />

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

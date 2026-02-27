import React, { memo, useState } from 'react';
import { ResumeCanvas } from './components/builder/ResumeCanvas';
import { useResumeActions } from './hooks/useResume';
import {
    Plus, Settings, Layout, Sun, Moon,
    Briefcase, GraduationCap, Code, Rocket,
    Loader2, Sparkles, X, Terminal, Copy, User, Download, FileText
} from 'lucide-react';
import { BlockType } from '@shared/types';
import { OnboardingModal } from './components/ui/OnboardingModal';
import { geminiService } from './services/ai';
import { manualLatexGenerator } from './services/manualLatex';
import { pdf } from '@react-pdf/renderer';
import { PdfDocument } from './components/builder/PdfDocument';

function App() {
    const {
        addBlock, apiKey, setApiKey, blocks,
        customTemplate, setCustomTemplate
    } = useResumeActions();
    const [isDark, setIsDark] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [isAssembling, setIsAssembling] = useState(false);
    const [fullLatex, setFullLatex] = useState<string | null>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [previewMode, setPreviewMode] = useState<'code' | 'pdf'>('code');
    const [compilationLog, setCompilationLog] = useState<string | null>(null);
    const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

    const hasTriggeredOnboarding = React.useRef(false);

    React.useEffect(() => {
        if (hasTriggeredOnboarding.current) return;

        // Trigger onboarding only once per session if no header exists
        const hasHeader = blocks.some(b => b.type === 'header');
        if (!hasHeader && !isAssembling) {
            setIsOnboardingOpen(true);
            hasTriggeredOnboarding.current = true;
        }
    }, [blocks, isAssembling]);

    React.useEffect(() => {
        if (isDark) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    }, [isDark]);

    const blockButtons: { type: BlockType; label: string; icon: any }[] = [
        { type: 'header', label: 'Header', icon: User },
        { type: 'experience', label: 'Experience', icon: Briefcase },
        { type: 'education', label: 'Education', icon: GraduationCap },
        { type: 'skills', label: 'Skills', icon: Code },
        { type: 'project', label: 'Project', icon: Rocket },
    ];

    const handleManualAssemble = () => {
        const latex = manualLatexGenerator.generate(blocks);
        setFullLatex(latex);
        setPreviewMode('code');
        setPdfUrl(null);
    };

    const handleAssemble = async () => {
        setIsAssembling(true);
        try {
            const latex = await geminiService.assembleFullResume(blocks, customTemplate, apiKey);
            setFullLatex(latex);
            setPreviewMode('code');
            setPdfUrl(null);
        } catch (error) {
            alert("Failed to assemble resume. Check your API key.");
        } finally {
            setIsAssembling(false);
        }
    };

    const downloadTex = () => {
        if (!fullLatex) return;
        const blob = new Blob([fullLatex], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'resume.tex';
        link.click();
        URL.revokeObjectURL(url);
    };

    const downloadPdf = async (shouldDownload = true) => {
        setIsGeneratingPdf(true);
        try {
            setCompilationLog(null);

            // Construct PDF blob completely locally using React-PDF
            const blob = await pdf(<PdfDocument blocks={blocks} />).toBlob();
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
            console.error("PDF Error:", error);
            setCompilationLog(error.message || "Unknown error generating PDF locally");
            alert("Error generating PDF locally. Check blocks.");
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    return (
        <div className="h-screen w-screen flex flex-col bg-white dark:bg-black overflow-hidden font-mono selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
            <header className="h-10 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black flex items-center justify-between px-4 z-20 shrink-0">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <Terminal size={14} className="text-black dark:text-white" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-black dark:text-white">ResumeForge.core</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsDark(!isDark)}
                        className="text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
                    >
                        {isDark ? <Sun size={14} /> : <Moon size={14} />}
                    </button>

                    <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800"></div>

                    <div className="relative">
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-black dark:hover:text-white transition-colors flex items-center gap-2"
                        >
                            <Settings size={12} />
                            Config
                        </button>

                        {showSettings && (
                            <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-zinc-900 border border-black dark:border-zinc-700 p-6 z-50">
                                <div className="flex justify-between items-center mb-6">
                                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400">Environment Variables</p>
                                    <button onClick={() => setShowSettings(false)}><X size={12} className="text-zinc-400 hover:text-black" /></button>
                                </div>
                                <div className="flex flex-col gap-6">
                                    <div>
                                        <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-2 block">AI_API_KEY</label>
                                        <input
                                            type="password"
                                            className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-[10px] outline-none focus:border-black dark:focus:border-white transition-all text-zinc-900 dark:text-zinc-100"
                                            value={apiKey || ''}
                                            onChange={(e) => setApiKey(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-2 block">CUSTOM_LATEX_TEMPLATE</label>
                                        <textarea
                                            className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-[10px] min-h-[120px] outline-none focus:border-black dark:focus:border-white transition-all text-zinc-900 dark:text-zinc-100"
                                            value={customTemplate || ''}
                                            onChange={(e) => setCustomTemplate(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 p-1">
                        <button
                            onClick={handleAssemble}
                            disabled={isAssembling}
                            className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em] bg-black text-white dark:bg-white dark:text-black hover:opacity-80 disabled:opacity-30 transition-all flex items-center gap-2"
                        >
                            {isAssembling ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                            AI_COMPILE
                        </button>
                        <button
                            onClick={handleManualAssemble}
                            className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em] border border-black dark:border-white text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all flex items-center gap-2"
                        >
                            <Layout size={10} />
                            FAST_GEN
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex flex-1 relative overflow-hidden">
                <aside className="w-16 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black flex flex-col items-center py-6 gap-8 z-10 shrink-0">
                    <div className="text-zinc-300 dark:text-zinc-700 mb-2">
                        <Plus size={16} />
                    </div>
                    {blockButtons.map(({ type, label, icon: Icon }) => (
                        <button
                            key={type}
                            onClick={() => addBlock(type)}
                            className="group relative flex flex-col items-center gap-2 text-zinc-400 hover:text-black dark:hover:text-white transition-all"
                            title={label}
                        >
                            <div className="w-10 h-10 border border-zinc-100 dark:border-zinc-900 flex items-center justify-center group-hover:border-black dark:group-hover:border-white group-hover:bg-zinc-50 dark:group-hover:bg-zinc-900 transition-all">
                                <Icon size={18} strokeWidth={1.5} />
                            </div>
                            <span className="text-[7px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity absolute top-full mt-2 whitespace-nowrap bg-black text-white px-2 py-1">
                                ADD_{label.toUpperCase()}
                            </span>
                        </button>
                    ))}
                </aside>

                <main className="flex-1 relative overflow-hidden">
                    <ResumeCanvas />

                    {fullLatex && (
                        <div className="absolute inset-0 z-50 bg-white dark:bg-black flex flex-col animate-in fade-in duration-300">
                            <header className="h-12 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-6">
                                <div className="flex items-center gap-8">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-black dark:bg-white animate-pulse"></div>
                                        <h2 className="text-[10px] font-bold uppercase tracking-[0.3em]">Build_Output</h2>
                                    </div>
                                    <div className="flex border border-zinc-100 dark:border-zinc-800 p-0.5">
                                        <button
                                            onClick={() => setPreviewMode('code')}
                                            className={`px-4 py-1.5 text-[9px] font-bold uppercase tracking-widest transition-all ${previewMode === 'code' ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-zinc-400'}`}
                                        >
                                            Source
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (!pdfUrl) downloadPdf(false);
                                                else setPreviewMode('pdf');
                                            }}
                                            className={`px-4 py-1.5 text-[9px] font-bold uppercase tracking-widest transition-all ${previewMode === 'pdf' ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-zinc-400'}`}
                                        >
                                            Preview
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(fullLatex);
                                            alert("Copied.");
                                        }}
                                        className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 hover:text-black flex items-center gap-2"
                                    >
                                        <Copy size={12} /> Copy
                                    </button>
                                    <button
                                        onClick={() => downloadPdf(true)}
                                        disabled={isGeneratingPdf}
                                        className="bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-[9px] font-bold uppercase tracking-widest hover:opacity-80 disabled:opacity-30"
                                    >
                                        {isGeneratingPdf ? <FileText size={16} className="animate-spin" /> : <FileText size={16} />}
                                        {isGeneratingPdf ? "COMPILING..." : "EXP_PDF"}
                                    </button>
                                    <button
                                        onClick={downloadTex}
                                        className="flex items-center gap-2 px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-zinc-500 hover:text-black transition-all"
                                    >
                                        <Download size={12} /> .TEX
                                    </button>
                                    <div className="w-px h-4 bg-zinc-200"></div>
                                    <button
                                        onClick={() => setFullLatex(null)}
                                        className="text-zinc-400 hover:text-black"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </header>
                            <div className="flex-1 overflow-hidden p-12 bg-zinc-50 dark:bg-zinc-950 flex justify-center">
                                <div className="w-full max-w-5xl bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 flex flex-col shadow-2xl">
                                    {previewMode === 'code' ? (
                                        <pre className="flex-1 p-12 text-[11px] font-mono overflow-auto leading-relaxed text-zinc-800 dark:text-zinc-300">
                                            {fullLatex}
                                        </pre>
                                    ) : (
                                        <div className="flex-1 relative bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
                                            {isGeneratingPdf ? (
                                                <div className="flex flex-col items-center gap-4">
                                                    <Loader2 size={24} className="animate-spin text-black" />
                                                    <p className="text-[8px] font-bold tracking-[0.4em] uppercase">System.Compiling</p>
                                                </div>
                                            ) : pdfUrl ? (
                                                <iframe src={pdfUrl} className="w-full h-full border-none" title="PDF" />
                                            ) : compilationLog ? (
                                                <div className="flex-1 w-full p-8 overflow-auto font-mono text-[10px] text-red-500 bg-zinc-50">
                                                    <p className="font-bold mb-4 uppercase tracking-widest underline">Critical Compilation Error</p>
                                                    <pre>{compilationLog}</pre>
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

            <OnboardingModal
                isOpen={isOnboardingOpen}
                onClose={() => setIsOnboardingOpen(false)}
            />
        </div>
    );
}

export default memo(App);

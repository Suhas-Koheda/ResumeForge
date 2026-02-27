import React, { memo, useState } from 'react';
import { ResumeCanvas } from './components/builder/ResumeCanvas';
import { useResumeActions } from './hooks/useResume';
import {
    PlusCircle, Settings, LayoutGrid, Sun, Moon,
    Briefcase, GraduationCap, Code, Rocket,
    FileText, Download, Loader2, Sparkles, X, FileCode, Copy, User
} from 'lucide-react';
import { BlockType } from './types/block';
import { geminiService } from './services/ai';
import { manualLatexGenerator } from './services/manualLatex';

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

    React.useEffect(() => {
        if (isDark) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    }, [isDark]);

    const blockButtons: { type: BlockType; label: string; color: string; icon: any }[] = [
        { type: 'experience', label: 'Experience', color: 'bg-orange-500', icon: Briefcase },
        { type: 'education', label: 'Education', color: 'bg-blue-500', icon: GraduationCap },
        { type: 'skills', label: 'Skills', color: 'bg-green-500', icon: Code },
        { type: 'project', label: 'Project', color: 'bg-purple-500', icon: Rocket },
        { type: 'header', label: 'Personal Header', color: 'bg-indigo-500', icon: User },
    ];

    const handleManualAssemble = () => {
        const latex = manualLatexGenerator.generate(blocks);
        setFullLatex(latex);
        setPreviewMode('code');
        setPdfUrl(null);
    };

    const handleAssemble = async () => {
        if (!apiKey) {
            alert("Please set your Gemini API Key in Settings first.");
            setShowSettings(true);
            return;
        }
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
        if (!fullLatex) return;
        setIsGeneratingPdf(true);
        try {
            setCompilationLog(null);
            const formData = new FormData();
            formData.append('filecontents[]', fullLatex);
            formData.append('filename[]', 'resume.tex');
            formData.append('engine', 'pdflatex');
            formData.append('return', 'pdf');

            const response = await fetch('https://texlive.net/cgi-bin/latexcgi', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('PDF Generation failed');

            const blob = await response.blob();
            if (blob.type === 'application/pdf') {
                const url = URL.createObjectURL(blob);
                setPdfUrl(url);
                setPreviewMode('pdf');

                if (shouldDownload) {
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'resume.pdf';
                    link.click();
                }
            } else {
                const text = await blob.text();
                setCompilationLog(text);
                throw new Error("LaTeX Compilation Error");
            }
        } catch (error) {
            console.error("PDF Error:", error);
            if (!compilationLog) {
                alert("The PDF service is currently busy. Please try again or download the .TEX file.");
            }
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const exportJson = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(blocks, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "resume-workflow.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    return (
        <div className="h-screen w-screen flex flex-col bg-[#fafafa] dark:bg-zinc-950 overflow-hidden font-sans">
            <header className="h-14 border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between px-4 z-20 shrink-0 shadow-sm transition-colors duration-300">
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm shadow-indigo-200/50 dark:shadow-none">
                        <LayoutGrid size={18} />
                    </div>
                    <span className="font-bold text-gray-800 dark:text-gray-100 tracking-tight">Antigravity Resume</span>
                    <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-2.5 py-0.5 rounded-lg font-bold ml-2 border border-indigo-200 dark:border-indigo-800 tracking-wider">PRO</span>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsDark(!isDark)}
                        className="p-2 text-muted-foreground hover:bg-secondary dark:hover:bg-zinc-800 rounded-xl transition-all"
                    >
                        {isDark ? <Sun size={18} /> : <Moon size={18} />}
                    </button>

                    <div className="h-6 w-px bg-border/50 mx-1"></div>

                    <div className="relative">
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${showSettings ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary dark:hover:bg-zinc-800'}`}
                        >
                            <Settings size={16} />
                            Settings
                        </button>

                        {showSettings && (
                            <div className="absolute top-full right-0 mt-2 w-96 bg-white dark:bg-zinc-900 border border-border shadow-lift rounded-2xl p-5 z-50 animate-in fade-in slide-in-from-top-2">
                                <div className="flex justify-between items-center mb-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Configuration</p>
                                    <button onClick={() => setShowSettings(false)}><X size={14} className="text-muted-foreground hover:text-foreground" /></button>
                                </div>
                                <div className="flex flex-col gap-5">
                                    <div>
                                        <label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-1.5 block">Gemini API Key</label>
                                        <input
                                            type="password"
                                            className="w-full bg-secondary/50 dark:bg-zinc-800 rounded-xl px-3 py-2 text-xs border border-border outline-none focus:border-primary transition-all font-mono"
                                            placeholder="AI Key for Polishing..."
                                            value={apiKey || ''}
                                            onChange={(e) => setApiKey(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-1.5 block">Custom Overleaf Template (Optional)</label>
                                        <textarea
                                            className="w-full bg-secondary/50 dark:bg-zinc-800 rounded-xl px-3 py-2 text-[10px] font-mono border border-border outline-none focus:border-primary min-h-[120px]"
                                            placeholder="Paste LaTeX code here. Use [CONTENT_HERE] where you want nodes to go..."
                                            value={customTemplate || ''}
                                            onChange={(e) => setCustomTemplate(e.target.value)}
                                        />
                                        <p className="text-[9px] text-muted-foreground mt-2 italic">Gemini will intelligently map your canvas nodes into this template.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex bg-secondary/30 dark:bg-zinc-800/50 p-1 rounded-xl items-center gap-1 shadow-inner">
                        <button
                            onClick={handleAssemble}
                            disabled={isAssembling}
                            className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-[0.1em] bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-all shadow-sm active:scale-95"
                        >
                            {isAssembling ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                            {isAssembling ? "Assembling..." : "AI Assemble"}
                        </button>
                        <button
                            onClick={handleManualAssemble}
                            className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-[0.1em] border border-indigo-600/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 rounded-lg transition-all shadow-sm active:scale-95"
                        >
                            <FileText size={14} />
                            Fast Export
                        </button>
                        <button
                            onClick={exportJson}
                            className="p-2 text-muted-foreground hover:text-primary transition-colors"
                            title="Export JSON State"
                        >
                            <FileCode size={18} />
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex flex-1 relative overflow-hidden">
                <aside className="w-64 border-r border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col z-10 shrink-0 transition-colors duration-300">
                    <div className="p-5 border-b border-gray-100 dark:border-zinc-800/80 flex items-center gap-2">
                        <PlusCircle size={16} className="text-primary/40" />
                        <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Components</h2>
                    </div>
                    <div className="p-4 flex flex-col gap-3 overflow-y-auto">
                        {blockButtons.map(({ type, label, color, icon: Icon }) => (
                            <button
                                key={type}
                                onClick={() => addBlock(type)}
                                className="flex items-center gap-4 w-full p-3 hover:bg-secondary/50 dark:hover:bg-zinc-800/50 rounded-2xl border border-transparent hover:border-border transition-all text-left group active:scale-[0.98]"
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-soft transition-transform group-hover:scale-110 group-hover:rotate-3 ${color}`}>
                                    <Icon size={20} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-tight">{label}</span>
                                    <span className="text-[10px] text-muted-foreground mt-0.5 font-medium">Add to Canvas</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </aside>

                <main className="flex-1 relative overflow-hidden bg-background">
                    <ResumeCanvas />

                    {fullLatex && (
                        <div className="absolute inset-0 z-50 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md flex flex-col animate-in fade-in duration-500">
                            <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-white dark:bg-zinc-900">
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-2">
                                        <Sparkles size={18} className="text-indigo-500" />
                                        <h2 className="font-bold text-foreground">Resume Export</h2>
                                    </div>
                                    <div className="flex bg-secondary/50 dark:bg-zinc-800 p-1 rounded-xl">
                                        <button
                                            onClick={() => setPreviewMode('code')}
                                            className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${previewMode === 'code' ? 'bg-white dark:bg-zinc-700 shadow-sm text-primary' : 'text-muted-foreground'}`}
                                        >
                                            Source Code
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (!pdfUrl) downloadPdf(false);
                                                else setPreviewMode('pdf');
                                            }}
                                            className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${previewMode === 'pdf' ? 'bg-white dark:bg-zinc-700 shadow-sm text-primary' : 'text-muted-foreground'}`}
                                        >
                                            PDF Preview
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(fullLatex);
                                            alert("Full LaTeX copied to clipboard!");
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-secondary text-foreground hover:bg-border rounded-xl transition-all"
                                    >
                                        <Copy size={16} /> Copy Code
                                    </button>
                                    <button
                                        onClick={() => downloadPdf(true)}
                                        disabled={isGeneratingPdf}
                                        className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl transition-all shadow-soft disabled:opacity-50"
                                    >
                                        {isGeneratingPdf ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                                        {isGeneratingPdf ? "Generating PDF..." : "Download PDF"}
                                    </button>
                                    <button
                                        onClick={downloadTex}
                                        className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl transition-all shadow-soft"
                                    >
                                        <Download size={16} /> Download .TEX
                                    </button>
                                    <button
                                        onClick={() => setFullLatex(null)}
                                        className="p-2 ml-2 hover:bg-secondary rounded-full transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </header>
                            <div className="flex-1 overflow-hidden p-8 lg:p-12 flex justify-center bg-gray-100 dark:bg-zinc-900/50">
                                <div className="w-full max-w-5xl bg-white dark:bg-zinc-950 shadow-2xl rounded-2xl border border-border overflow-hidden flex flex-col">
                                    {previewMode === 'code' ? (
                                        <>
                                            <div className="flex justify-between items-center p-4 border-b border-border bg-white dark:bg-zinc-950">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Overleaf Compatible Source</span>
                                            </div>
                                            <pre className="flex-1 bg-zinc-950 text-indigo-400 p-8 font-mono text-sm overflow-auto selection:bg-indigo-500/30">
                                                {fullLatex}
                                            </pre>
                                        </>
                                    ) : (
                                        <div className="flex-1 relative bg-zinc-800 flex items-center justify-center">
                                            {isGeneratingPdf ? (
                                                <div className="flex flex-col items-center gap-4 text-white">
                                                    <Loader2 size={40} className="animate-spin text-indigo-400" />
                                                    <p className="text-sm font-bold tracking-widest uppercase">Compiling LaTeX...</p>
                                                </div>
                                            ) : pdfUrl ? (
                                                <iframe
                                                    src={pdfUrl}
                                                    className="w-full h-full border-none"
                                                    title="PDF Preview"
                                                />
                                            ) : compilationLog ? (
                                                <div className="flex-1 w-full bg-zinc-900 overflow-auto p-4 flex flex-col">
                                                    <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
                                                        <span className="text-red-400 font-bold text-xs">LaTeX Compilation Error</span>
                                                        <button
                                                            onClick={handleManualAssemble}
                                                            className="text-[10px] text-indigo-400 hover:underline"
                                                        >
                                                            Retry with Auto-Fix
                                                        </button>
                                                    </div>
                                                    <pre className="text-[10px] text-zinc-400 font-mono leading-relaxed">
                                                        {compilationLog}
                                                    </pre>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => downloadPdf(false)}
                                                    className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lift hover:bg-indigo-700 transition-all"
                                                >
                                                    Generate Preview
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

export default memo(App);

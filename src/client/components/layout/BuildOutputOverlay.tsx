import React from 'react';
import { X, Loader2 } from 'lucide-react';

interface BuildOutputOverlayProps {
    showBuildOutput: boolean;
    setShowBuildOutput: (val: boolean) => void;
    previewMode: 'code' | 'pdf';
    setPreviewMode: (val: 'code' | 'pdf') => void;
    pdfUrl: string | null;
    isGeneratingPdf: boolean;
    compilationLog: string | null;
    downloadPdf: (download?: boolean) => void;
    handleManualAssemble: (latex?: string, filename?: string) => void;
    MultiFileEditor: React.FC<any>;
}

export const BuildOutputOverlay: React.FC<BuildOutputOverlayProps> = ({
    showBuildOutput, setShowBuildOutput, previewMode, setPreviewMode,
    pdfUrl, isGeneratingPdf, compilationLog, downloadPdf,
    handleManualAssemble, MultiFileEditor
}) => {
    if (!showBuildOutput) return null;

    return (
        <div className="absolute inset-0 z-50 bg-white dark:bg-black flex flex-col animate-in fade-in duration-300">
            <header className="h-12 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-2 sm:px-6">
                <div className="flex items-center gap-2 sm:gap-8">
                    <h2 className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">Compiler_Output</h2>
                    <div className="flex border border-zinc-100 dark:border-zinc-800 p-0.5">
                        <button 
                            onClick={() => setPreviewMode('code')} 
                            className={`px-2 sm:px-4 py-1.5 text-[8px] sm:text-[9px] font-bold uppercase tracking-widest ${previewMode === 'code' ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-zinc-400'}`}
                        >
                            Source
                        </button>
                        <button 
                            onClick={() => { if (!pdfUrl) downloadPdf(false); else setPreviewMode('pdf'); }} 
                            className={`px-2 sm:px-4 py-1.5 text-[8px] sm:text-[9px] font-bold uppercase tracking-widest ${previewMode === 'pdf' ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-zinc-400'}`}
                        >
                            Preview
                        </button>
                    </div>
                </div>
                <button onClick={() => setShowBuildOutput(false)} className="text-zinc-400 hover:text-black p-1">
                    <X size={16} />
                </button>
            </header>
            <div className="flex-1 overflow-hidden p-2 sm:p-12 bg-zinc-50 dark:bg-zinc-950 flex justify-center">
                <div className="w-full max-w-5xl bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 flex flex-col shadow-2xl overflow-hidden text-[13px]">
                    {previewMode === 'code' ? (
                        <MultiFileEditor 
                            onCompile={(latex: string, filename: string) => handleManualAssemble(latex, filename)} 
                            isCompiling={isGeneratingPdf} 
                        />
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
    );
};

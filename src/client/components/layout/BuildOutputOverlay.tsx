import React, { useState, useMemo } from 'react';
import { X, Loader2, Copy, ChevronDown, ChevronUp, AlertTriangle, CheckCircle } from 'lucide-react';

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

/**
 * Extracts the most meaningful error line(s) from a LaTeX compilation log.
 * LaTeX logs are verbose — we find the key "! Error:" lines and the context around them.
 */
function extractLatexError(log: string): { summary: string; hasMore: boolean } {
    if (!log) return { summary: log, hasMore: false };

    const lines = log.split('\n');

    // 1. Look for lines starting with "!" (LaTeX fatal errors)
    const errorLines: string[] = [];
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        if (line.startsWith('!')) {
            // Grab the error line + next contextual line (often "l.XX content")
            errorLines.push(line.trim());
            if (i + 1 < lines.length && lines[i + 1].match(/^l\.\d+/)) {
                errorLines.push(lines[i + 1].trim());
            }
        }
        i++;
    }

    // 2. Also look for common error patterns
    const fileNotFoundMatch = log.match(/(?:File|Package|Class)\s+['"`]?([^\s'"`,]+)['"`]?\s+not found/i);
    if (fileNotFoundMatch) {
        errorLines.unshift(`Missing file or package: "${fileNotFoundMatch[1]}"`);
    }

    // 3. Look for "undefined control sequence" errors
    const undefinedMatch = log.match(/Undefined control sequence[.\s\S]{0,80}/);
    if (undefinedMatch && !errorLines.some(e => e.includes('Undefined control sequence'))) {
        errorLines.push(undefinedMatch[0].replace(/\s+/g, ' ').trim());
    }

    // 4. Multi-file template hint
    const multiFileHint = log.includes('.cls') || log.includes('.sty')
        ? 'Hint: This template requires additional .cls or .sty files. Upload them via the file explorer.'
        : null;

    if (errorLines.length > 0) {
        const summary = [...new Set(errorLines)].slice(0, 3).join('\n') +
            (multiFileHint ? '\n\n' + multiFileHint : '');
        return { summary, hasMore: log.length > summary.length + 50 };
    }

    // 5. Fallback: first 3 non-empty lines
    const shortLines = lines.filter(l => l.trim().length > 2).slice(0, 3).join('\n');
    return { summary: shortLines || log.slice(0, 200), hasMore: log.length > 300 };
}

export const BuildOutputOverlay: React.FC<BuildOutputOverlayProps> = ({
    showBuildOutput, setShowBuildOutput, previewMode, setPreviewMode,
    pdfUrl, isGeneratingPdf, compilationLog, downloadPdf,
    handleManualAssemble, MultiFileEditor
}) => {
    const [showFullError, setShowFullError] = useState(false);
    const [copied, setCopied] = useState(false);

    const errorInfo = useMemo(() =>
        compilationLog ? extractLatexError(compilationLog) : null,
        [compilationLog]
    );

    const handleCopy = () => {
        if (!compilationLog) return;
        navigator.clipboard.writeText(compilationLog);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

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
                                    : compilationLog && errorInfo
                                        ? (
                                            <div className="flex flex-col items-center justify-center p-6 sm:p-8 w-full h-full text-zinc-900 bg-red-50 dark:bg-red-950/20 overflow-y-auto">
                                                <div className="max-w-2xl w-full border border-red-200 dark:border-red-900 rounded-lg bg-white dark:bg-black p-6 shadow-xl">
                                                    {/* Header */}
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="flex items-center gap-2">
                                                            <AlertTriangle size={14} className="text-red-500 shrink-0" />
                                                            <h3 className="text-red-500 font-bold uppercase tracking-widest text-[11px]">
                                                                Compile_Error
                                                            </h3>
                                                        </div>
                                                        <button
                                                            onClick={handleCopy}
                                                            className="flex items-center gap-1.5 text-zinc-400 hover:text-black dark:hover:text-white transition-all bg-zinc-100 dark:bg-zinc-900 px-2.5 py-1.5 rounded-md"
                                                        >
                                                            {copied
                                                                ? <><CheckCircle size={10} className="text-green-500" /><span className="text-[9px] text-green-500">Copied!</span></>
                                                                : <><Copy size={10} /><span className="text-[9px]">Copy Full Log</span></>
                                                            }
                                                        </button>
                                                    </div>

                                                    {/* Short summary — always visible */}
                                                    <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-md p-4 mb-3">
                                                        <pre className="text-red-600 dark:text-red-400 font-mono text-[11px] whitespace-pre-wrap leading-relaxed break-words">
                                                            {errorInfo.summary}
                                                        </pre>
                                                    </div>

                                                    {/* Multi-file template hint */}
                                                    {(compilationLog.includes('.cls') || compilationLog.includes('.sty')) && (
                                                        <div className="mb-3 flex items-start gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-md p-3">
                                                            <AlertTriangle size={11} className="text-amber-500 shrink-0 mt-0.5" />
                                                            <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed font-medium">
                                                                This template requires additional <code className="font-mono">.cls</code> or <code className="font-mono">.sty</code> files.
                                                                Switch to <strong>Source</strong> view and upload them via the file explorer.
                                                            </p>
                                                        </div>
                                                    )}

                                                    {/* Full trace toggle */}
                                                    {errorInfo.hasMore && (
                                                        <>
                                                            <button
                                                                onClick={() => setShowFullError(!showFullError)}
                                                                className="mt-1 flex items-center justify-center gap-1.5 w-full text-[9px] font-bold uppercase tracking-widest text-zinc-500 hover:text-black dark:hover:text-white transition-all py-2.5 border border-zinc-100 dark:border-zinc-800 rounded-md bg-zinc-50 dark:bg-zinc-900"
                                                            >
                                                                {showFullError
                                                                    ? <><ChevronUp size={12} /> Hide Full Trace</>
                                                                    : <><ChevronDown size={12} /> Show Full Trace</>
                                                                }
                                                            </button>
                                                            {showFullError && (
                                                                <pre className="mt-3 text-zinc-500 dark:text-zinc-400 font-mono text-[10px] whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto border border-zinc-100 dark:border-zinc-800 rounded-md p-3 bg-zinc-50 dark:bg-zinc-950 break-words">
                                                                    {compilationLog}
                                                                </pre>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                        : null}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

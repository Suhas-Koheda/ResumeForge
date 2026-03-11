import React from 'react';
import { ArrowRight, Sparkles, Code, FileText } from 'lucide-react';

export const Landing = ({ onGetStarted }: { onGetStarted: () => void }) => {
    return (
        <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white flex flex-col font-mono selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
            <header className="h-16 flex items-center justify-between px-8 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-black uppercase tracking-[0.3em]">ResumeForge</span>
                </div>
                <button 
                    onClick={onGetStarted}
                    className="text-[13px] font-bold uppercase tracking-widest hover:opacity-70 transition-opacity"
                >
                    Sign In
                </button>
            </header>
            
            <main className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-4xl mx-auto">
                <div className="mb-8 p-3 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <Sparkles className="w-8 h-8" />
                </div>
                
                <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-6 leading-tight">
                    The Modern <br/>
                    <span className="text-zinc-400">LaTeX Resume</span> Engine
                </h1>
                
                <p className="max-w-xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 mb-12">
                    Build professional, ATS-optimized LaTeX resumes without writing a single line of code. 
                    AI-powered assembly, drag-and-drop canvas, and instant PDF compilation.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                    <button 
                        onClick={onGetStarted}
                        className="group flex items-center justify-center gap-3 bg-black text-white dark:bg-white dark:text-black px-8 py-4 text-sm font-bold uppercase tracking-widest hover:opacity-90 transition-all border border-transparent"
                    >
                        Enter Forge
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

                <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 w-full border-t border-zinc-200 dark:border-zinc-800 pt-16 text-left">
                    <div className="flex flex-col gap-3">
                        <FileText className="w-5 h-5 mb-2" />
                        <h3 className="text-[14px] font-bold uppercase tracking-widest">Visual Canvas</h3>
                        <p className="text-sm text-zinc-500 leading-relaxed">Drag-and-drop blocks to build structure instantly, without syntax errors.</p>
                    </div>
                    <div className="flex flex-col gap-3">
                        <Code className="w-5 h-5 mb-2" />
                        <h3 className="text-[14px] font-bold uppercase tracking-widest">LaTeX Export</h3>
                        <p className="text-sm text-zinc-500 leading-relaxed">Compiles directly to native PDF or raw .TEX files immediately.</p>
                    </div>
                    <div className="flex flex-col gap-3">
                        <Sparkles className="w-5 h-5 mb-2" />
                        <h3 className="text-[14px] font-bold uppercase tracking-widest">AI Assembly</h3>
                        <p className="text-sm text-zinc-500 leading-relaxed">Let Gemini generate and polish high-impact experience bullets.</p>
                    </div>
                </div>
            </main>
        </div>
    );
};

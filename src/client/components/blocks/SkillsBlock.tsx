import React, { memo, useState } from 'react';
import { useBlock } from '../../hooks/useResume';
import { useBuilderStore } from '../../store/useBuilderStore';
import { geminiService } from '../../services/ai';
import { Sparkles, Copy, Loader2, Code as CodeIcon } from 'lucide-react';

interface SkillsBlockProps {
    id: string;
}

export const SkillsBlock: React.FC<SkillsBlockProps> = memo(({ id }) => {
    const { data, updateData } = useBlock(id);
    const apiKey = useBuilderStore(state => state.apiKey);
    const [isPolishing, setIsPolishing] = useState(false);
    const [showLatex, setShowLatex] = useState(false);
    const [rawInput, setRawInput] = useState('');

    if (!data) return null;

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        updateData({ skills: e.target.value });
    };

    const handleAiPolish = async () => {
        if (!rawInput.trim()) return;

        setIsPolishing(true);
        try {
            const result = await geminiService.polishSkills(rawInput, apiKey);
            updateData({
                skills: result.skills,
                latexCode: result.latexCode
            });
            setRawInput('');
        } catch (error) {
            alert("AI Categorization failed.");
        } finally {
            setIsPolishing(false);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Categorized_Skills</label>
                <textarea
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 p-3 text-[10px] outline-none focus:border-black dark:focus:border-white transition-all text-zinc-800 dark:text-zinc-200 resize-y min-h-[100px] leading-relaxed font-mono placeholder:text-zinc-300 dark:placeholder:text-zinc-700"
                    value={data.skills || ''}
                    onChange={handleChange}
                    placeholder="Lang: JS, TS; Tools: Git, Docker..."
                />
            </div>

            <div className="p-5 border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-black/50 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-black dark:text-white">
                    <Sparkles size={12} />
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em]">Neural Categorizer</span>
                </div>
                <textarea
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-3 text-[10px] outline-none focus:border-black dark:focus:border-white min-h-[60px] leading-relaxed"
                    placeholder="Input raw keywords or job requirements..."
                    value={rawInput}
                    onChange={(e) => setRawInput(e.target.value)}
                />
                <button
                    onClick={handleAiPolish}
                    disabled={isPolishing || !rawInput.trim()}
                    className="bg-black dark:bg-white text-white dark:text-black py-2.5 text-[9px] font-bold uppercase tracking-[0.22em] hover:opacity-80 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
                >
                    {isPolishing ? <Loader2 size={12} className="animate-spin" /> : null}
                    {isPolishing ? "Processing" : "Cluster Skills"}
                </button>
            </div>

            {data.latexCode && (
                <div className="flex flex-col gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-zinc-400">
                            <CodeIcon size={14} />
                            <span className="text-[9px] font-bold uppercase tracking-widest">TEX_BLOB</span>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setShowLatex(!showLatex)} className="text-[9px] font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-widest hover:underline">{showLatex ? 'Close' : 'Debug'}</button>
                            <button onClick={() => { navigator.clipboard.writeText(data.latexCode); alert('Copied.'); }} className="text-[9px] font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-widest flex items-center gap-1 hover:underline"><Copy size={12} /> Copy</button>
                        </div>
                    </div>
                    {showLatex && (
                        <pre className="p-4 bg-zinc-50 dark:bg-black text-zinc-400 text-[10px] font-mono overflow-auto border border-zinc-100 dark:border-zinc-800 max-h-[150px] leading-relaxed">
                            {data.latexCode}
                        </pre>
                    )}
                </div>
            )}
        </div>
    );
});

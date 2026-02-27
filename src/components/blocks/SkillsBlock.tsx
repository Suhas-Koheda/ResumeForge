import React, { memo, useState } from 'react';
import { useBlock } from '../../hooks/useResume';
import { useBuilderStore } from '../../store/useBuilderStore';
import { geminiService } from '../../services/ai';
import { Sparkles, Code2, Copy, Loader2, Code as CodeIcon } from 'lucide-react';

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
        if (!apiKey) {
            alert("Please set your Gemini API Key in the Settings first.");
            return;
        }
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

    const copyLatex = () => {
        if (data.latexCode) {
            navigator.clipboard.writeText(data.latexCode);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block text-left">Categorized Skills</label>
                <textarea
                    className="w-full bg-secondary/30 dark:bg-zinc-800/50 border border-border/50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-foreground resize-y min-h-[100px] leading-relaxed placeholder:text-muted-foreground/50 text-left font-medium"
                    value={data.skills || ''}
                    onChange={handleChange}
                    placeholder="e.g. Languages: JavaScript, Python; Frameworks: React, Node..."
                />
            </div>

            <div className="p-4 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl flex flex-col gap-3">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <Sparkles size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-left">AI Skill Categorizer</span>
                </div>
                <textarea
                    className="w-full bg-white dark:bg-zinc-900 border border-emerald-100 dark:border-emerald-900/20 rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none min-h-[60px] max-h-[150px] overflow-y-auto text-left"
                    placeholder="Paste your raw list of skills here... Gemini will group them."
                    value={rawInput}
                    onChange={(e) => setRawInput(e.target.value)}
                />
                <button
                    onClick={handleAiPolish}
                    disabled={isPolishing || !rawInput.trim()}
                    className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2 text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50"
                >
                    {isPolishing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    {isPolishing ? "Categorizing..." : "Categorize with Gemini"}
                </button>
            </div>

            {data.latexCode && (
                <div className="flex flex-col gap-2 mt-2 text-left">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <CodeIcon size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">LaTeX Skills List</span>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setShowLatex(!showLatex)} className="text-[10px] font-bold text-primary px-2 py-1 rounded hover:bg-secondary">View</button>
                            <button onClick={copyLatex} className="text-[10px] font-bold text-primary px-2 py-1 rounded hover:bg-secondary flex items-center gap-1 shadow-sm"><Copy size={12} /> Copy</button>
                        </div>
                    </div>
                    {showLatex && (
                        <pre className="p-4 bg-zinc-950 text-emerald-400 rounded-xl text-[10px] font-mono overflow-auto border border-white/5 max-h-[200px]">
                            {data.latexCode}
                        </pre>
                    )}
                </div>
            )}
        </div>
    );
});

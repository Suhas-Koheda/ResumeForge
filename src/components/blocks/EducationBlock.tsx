import React, { memo, useState } from 'react';
import { useBlock } from '../../hooks/useResume';
import { useBuilderStore } from '../../store/useBuilderStore';
import { geminiService } from '../../services/ai';
import { Sparkles, Code2, Copy, Loader2 } from 'lucide-react';

interface EducationBlockProps {
    id: string;
}

export const EducationBlock: React.FC<EducationBlockProps> = memo(({ id }) => {
    const { data, updateData } = useBlock(id);
    const apiKey = useBuilderStore(state => state.apiKey);
    const [isPolishing, setIsPolishing] = useState(false);
    const [showLatex, setShowLatex] = useState(false);
    const [rawInput, setRawInput] = useState('');

    if (!data) return null;

    const handleChange = (field: string) => (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        updateData({ [field]: e.target.value });
    };

    const handleAiPolish = async () => {
        if (!apiKey) {
            alert("Please set your Gemini API Key in the Settings first.");
            return;
        }
        if (!rawInput.trim()) return;

        setIsPolishing(true);
        try {
            const result = await geminiService.polishEducation(rawInput, apiKey);
            updateData({
                school: result.school,
                degree: result.degree,
                year: result.year,
                latexCode: result.latexCode
            });
            setRawInput('');
        } catch (error) {
            alert("AI Polish failed.");
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
            <div className="flex flex-col gap-4">
                <div className="grid grid-cols-3 gap-6">
                    <div className="col-span-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block text-left">School / University</label>
                        <input
                            className="w-full bg-secondary/30 dark:bg-zinc-800/50 border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-foreground font-medium placeholder:text-muted-foreground/50 text-left"
                            value={data.school || ''}
                            onChange={handleChange('school')}
                            placeholder="e.g. MIT"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block text-left">Year</label>
                        <input
                            className="w-full bg-secondary/30 dark:bg-zinc-800/50 border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-foreground placeholder:text-muted-foreground/50 text-left"
                            value={data.year || ''}
                            onChange={handleChange('year')}
                            placeholder="e.g. 2020"
                        />
                    </div>
                </div>
                <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block text-left">Degree</label>
                    <input
                        className="w-full bg-secondary/30 dark:bg-zinc-800/50 border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-foreground font-semibold placeholder:text-muted-foreground/50 text-left"
                        value={data.degree || ''}
                        onChange={handleChange('degree')}
                        placeholder="e.g. B.S. Computer Science"
                    />
                </div>
            </div>

            <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl flex flex-col gap-3">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <Sparkles size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">AI Education Formatter</span>
                </div>
                <textarea
                    className="w-full bg-white dark:bg-zinc-900 border border-blue-100 dark:border-blue-900/20 rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 outline-none min-h-[60px] max-h-[150px] overflow-y-auto text-left"
                    placeholder="Paste school, degree, year... Gemini will sort it."
                    value={rawInput}
                    onChange={(e) => setRawInput(e.target.value)}
                />
                <button
                    onClick={handleAiPolish}
                    disabled={isPolishing || !rawInput.trim()}
                    className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2 text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50"
                >
                    {isPolishing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    {isPolishing ? "Formatting..." : "Format with Gemini"}
                </button>
            </div>

            {data.latexCode && (
                <div className="flex flex-col gap-2 mt-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Code2 size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-left">LaTeX Entry</span>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setShowLatex(!showLatex)} className="text-[10px] font-bold text-primary px-2 py-1 rounded hover:bg-secondary transition-colors">{showLatex ? 'Hide' : 'View'}</button>
                            <button onClick={copyLatex} className="text-[10px] font-bold text-primary px-2 py-1 rounded hover:bg-secondary transition-colors flex items-center gap-1 shadow-sm"><Copy size={12} /> Copy</button>
                        </div>
                    </div>
                    {showLatex && (
                        <pre className="p-4 bg-zinc-950 text-emerald-400 rounded-xl text-[10px] font-mono overflow-auto border border-white/5 max-h-[200px] text-left">
                            {data.latexCode}
                        </pre>
                    )}
                </div>
            )}
        </div>
    );
});

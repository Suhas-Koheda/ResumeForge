import React, { memo, useState } from 'react';
import { useBlock } from '../../hooks/useResume';
import { BulletListEditor } from '../ui/BulletListEditor';
import { useBuilderStore } from '../../store/useBuilderStore';
import { geminiService } from '../../services/ai';
import { Sparkles, Code2, Copy, Loader2 } from 'lucide-react';

interface ExperienceBlockProps {
    id: string;
}

export const ExperienceBlock: React.FC<ExperienceBlockProps> = memo(({ id }) => {
    const { data, updateData } = useBlock(id);
    const apiKey = useBuilderStore(state => state.apiKey);
    const [isPolishing, setIsPolishing] = useState(false);
    const [showLatex, setShowLatex] = useState(false);
    const [rawInput, setRawInput] = useState('');

    if (!data) return null;

    const handleChange = (field: string) => (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        updateData({ [field]: e.target.value });
    };

    const handleHighlightsChange = (newHighlights: string[]) => {
        updateData({ highlights: newHighlights });
    };

    const handleAiPolish = async () => {
        if (!apiKey) {
            alert("Please set your Gemini API Key in the Settings first.");
            return;
        }
        if (!rawInput.trim()) return;

        setIsPolishing(true);
        try {
            const result = await geminiService.polishExperience(rawInput, apiKey);
            updateData({
                highlights: result.polishedPoints,
                latexCode: result.latexCode
            });
            setRawInput('');
        } catch (error) {
            alert("AI Polish failed. Check console and API key.");
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
            {/* Standard Fields */}
            <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Company Name</label>
                        <input
                            className="w-full bg-secondary/30 dark:bg-zinc-800/50 border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-foreground font-medium placeholder:text-muted-foreground/50"
                            value={data.company || ''}
                            onChange={handleChange('company')}
                            placeholder="e.g. Acme Corp"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Duration</label>
                        <input
                            className="w-full bg-secondary/30 dark:bg-zinc-800/50 border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-foreground placeholder:text-muted-foreground/50"
                            value={data.duration || ''}
                            onChange={handleChange('duration')}
                            placeholder="e.g. 2021 - Present"
                        />
                    </div>
                </div>
                <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Role</label>
                    <input
                        className="w-full bg-secondary/30 dark:bg-zinc-800/50 border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-foreground font-semibold placeholder:text-muted-foreground/50"
                        value={data.role || ''}
                        onChange={handleChange('role')}
                        placeholder="e.g. Senior Software Engineer"
                    />
                </div>
            </div>

            {/* AI Assistant Section */}
            <div className="p-4 bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl flex flex-col gap-3">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <Sparkles size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">AI Experience Polisher</span>
                </div>
                <textarea
                    className="w-full bg-white dark:bg-zinc-900 border border-indigo-100 dark:border-indigo-900/20 rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none min-h-[80px] max-h-[200px] overflow-y-auto"
                    placeholder="Paste your raw job description here... (e.g. 'I led a team of 5 and we built a scaleable backend using GO and AWS')"
                    value={rawInput}
                    onChange={(e) => setRawInput(e.target.value)}
                />
                <button
                    onClick={handleAiPolish}
                    disabled={isPolishing || !rawInput.trim()}
                    className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2 text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50"
                >
                    {isPolishing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    {isPolishing ? "Polishing..." : "Polish with Gemini"}
                </button>
            </div>

            {/* Highlights / Bullet Points */}
            <BulletListEditor
                items={data.highlights || []}
                onChange={handleHighlightsChange}
            />

            {/* LaTeX Preview */}
            {data.latexCode && (
                <div className="flex flex-col gap-2 mt-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Code2 size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">LaTeX Export</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowLatex(!showLatex)}
                                className="text-[10px] font-bold text-primary hover:bg-secondary px-2 py-1 rounded"
                            >
                                {showLatex ? 'Hide' : 'View Code'}
                            </button>
                            <button
                                onClick={copyLatex}
                                className="text-[10px] font-bold text-primary hover:bg-secondary px-2 py-1 rounded flex items-center gap-1"
                            >
                                <Copy size={12} /> Copy
                            </button>
                        </div>
                    </div>
                    {showLatex && (
                        <pre className="p-4 bg-zinc-950 text-emerald-400 rounded-xl text-[10px] font-mono overflow-auto border border-white/5 max-h-[300px]">
                            {data.latexCode}
                        </pre>
                    )}
                </div>
            )}
        </div>
    );
});

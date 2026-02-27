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
            alert("AI Polish failed.");
        } finally {
            setIsPolishing(false);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-5">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 block">Company</label>
                        <input
                            className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 px-3 py-2 text-xs focus:border-black dark:focus:border-white transition-all outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-300"
                            value={data.company || ''}
                            onChange={handleChange('company')}
                            placeholder="Corporation Name"
                        />
                    </div>
                    <div>
                        <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 block">Duration</label>
                        <input
                            className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 px-3 py-2 text-xs focus:border-black dark:focus:border-white transition-all outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-300"
                            value={data.duration || ''}
                            onChange={handleChange('duration')}
                            placeholder="Jan 2020 - Present"
                        />
                    </div>
                </div>
                <div>
                    <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 block">Role</label>
                    <input
                        className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 px-3 py-2 text-xs focus:border-black dark:focus:border-white transition-all outline-none text-zinc-900 dark:text-zinc-100 font-bold placeholder:text-zinc-300"
                        value={data.role || ''}
                        onChange={handleChange('role')}
                        placeholder="Engineer / Designer"
                    />
                </div>
            </div>

            <div className="p-5 border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-black/50 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-black dark:text-white">
                    <Sparkles size={12} />
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em]">Neural Polisher</span>
                </div>
                <textarea
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-3 text-[10px] outline-none focus:border-black dark:focus:border-white min-h-[70px] leading-relaxed"
                    placeholder="Input raw job metrics and responsibilities..."
                    value={rawInput}
                    onChange={(e) => setRawInput(e.target.value)}
                />
                <button
                    onClick={handleAiPolish}
                    disabled={isPolishing || !rawInput.trim()}
                    className="bg-black dark:bg-white text-white dark:text-black py-2.5 text-[9px] font-bold uppercase tracking-[0.22em] hover:opacity-80 transition-all disabled:opacity-30 disabled:grayscale flex items-center justify-center gap-2"
                >
                    {isPolishing ? <Loader2 size={12} className="animate-spin" /> : null}
                    {isPolishing ? "Processing" : "Generate Points"}
                </button>
            </div>

            <BulletListEditor
                items={data.highlights || []}
                onChange={handleHighlightsChange}
            />

            {data.latexCode && (
                <div className="flex flex-col gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-zinc-400">
                            <Code2 size={14} />
                            <span className="text-[9px] font-bold uppercase tracking-widest">TEX_BLOB</span>
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowLatex(!showLatex)}
                                className="text-[9px] font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-widest hover:underline"
                            >
                                {showLatex ? 'Close' : 'Debug'}
                            </button>
                            <button
                                onClick={() => { navigator.clipboard.writeText(data.latexCode); alert('Copied.'); }}
                                className="text-[9px] font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-widest flex items-center gap-1 hover:underline"
                            >
                                <Copy size={12} /> Copy
                            </button>
                        </div>
                    </div>
                    {showLatex && (
                        <pre className="p-4 bg-zinc-50 dark:bg-black text-zinc-400 text-[10px] font-mono overflow-auto border border-zinc-100 dark:border-zinc-800 max-h-[200px] leading-relaxed">
                            {data.latexCode}
                        </pre>
                    )}
                </div>
            )}
        </div>
    );
});

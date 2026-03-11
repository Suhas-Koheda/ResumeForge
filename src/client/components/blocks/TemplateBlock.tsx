import React, { memo } from 'react';
import { useBlock } from '../../hooks/useResume';

interface TemplateBlockProps {
    id: string;
}

export const TemplateBlock: React.FC<TemplateBlockProps> = memo(({ id }) => {
    const { data, updateData } = useBlock(id);

    if (!data) return null;

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        updateData({ content: e.target.value });
    };

    return (
        <div className="flex flex-col gap-4">
            <div>
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 block">Custom LaTeX Template</label>
                <p className="text-[10px] text-zinc-500 mb-2 leading-tight">
                    Paste your LaTeX template here. Use placeholders like <code>[SECTION_NAME]</code> or let the AI intelligently inject content.
                </p>
                <textarea
                    className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 px-3 py-2 text-[11px] font-mono focus:border-black dark:focus:border-white transition-all outline-none text-zinc-900 dark:text-zinc-100 h-60 leading-relaxed placeholder:text-zinc-300"
                    value={data.content || ''}
                    onChange={handleChange}
                    placeholder="\documentclass{article}&#10;\begin{document}&#10;...&#10;\end{document}"
                />
            </div>
        </div>
    );
});

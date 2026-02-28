import React, { memo } from 'react';
import { useBlock } from '../../hooks/useResume';
import { BulletListEditor } from '../ui/BulletListEditor';

interface SummaryBlockProps {
    id: string;
}

export const SummaryBlock: React.FC<SummaryBlockProps> = memo(({ id }) => {
    const { data, updateData } = useBlock(id);

    if (!data) return null;

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        updateData({ summary: e.target.value });
    };

    const handleHighlightsChange = (newHighlights: string[]) => {
        updateData({ highlights: newHighlights });
    };

    return (
        <div className="flex flex-col gap-6">
            <div>
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 block">NARRATIVE OVERVIEW</label>
                <textarea
                    className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 px-3 py-3 text-xs focus:border-black dark:focus:border-white transition-all outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-300 min-h-[100px] leading-relaxed"
                    value={data.summary || ''}
                    onChange={handleTextChange}
                    placeholder="Write a brief professional overview of your career..."
                />
            </div>

            <div className="w-full border-t border-zinc-100 dark:border-zinc-800 pt-4">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-3 block text-center">-- OR TOP ACHIEVEMENTS (BULLET LIST) --</label>
                <BulletListEditor
                    items={data.highlights || []}
                    onChange={handleHighlightsChange}
                />
            </div>

            <p className="text-[8px] text-zinc-400 font-medium tracking-wide leading-relaxed">
                * This section will appear at the top of your resume, just below the header. You can use either the narrative paragraph, the bullet list, or both.
            </p>
        </div>
    );
});

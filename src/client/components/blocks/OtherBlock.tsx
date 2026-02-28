import React, { memo } from 'react';
import { useBlock } from '../../hooks/useResume';
import { BulletListEditor } from '../ui/BulletListEditor';

interface OtherBlockProps {
    id: string;
}

export const OtherBlock: React.FC<OtherBlockProps> = memo(({ id }) => {
    const { data, updateData } = useBlock(id);

    if (!data) return null;

    const handleChange = (field: string) => (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        updateData({ [field]: e.target.value });
    };

    const handleHighlightsChange = (newHighlights: string[]) => {
        updateData({ highlights: newHighlights });
    };

    return (
        <div className="flex flex-col gap-6">
            <div>
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 block">Section Title</label>
                <input
                    className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 px-3 py-2 text-xs focus:border-black dark:focus:border-white transition-all outline-none text-zinc-900 dark:text-zinc-100 font-bold placeholder:text-zinc-300 uppercase tracking-widest"
                    value={data.title || ''}
                    onChange={handleChange('title')}
                    placeholder="e.g. VOLUNTEERING / ACHIEVEMENTS"
                />
            </div>

            <div className="flex flex-col gap-4">
                <div>
                    <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 block">Plain Text Content (Optional)</label>
                    <textarea
                        className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 px-3 py-2 text-xs focus:border-black dark:focus:border-white transition-all outline-none text-zinc-900 dark:text-zinc-100 h-20 leading-relaxed placeholder:text-zinc-300"
                        value={data.content || ''}
                        onChange={handleChange('content')}
                        placeholder="Generic text block content..."
                        disabled={data.highlights && data.highlights.length > 0}
                    />
                </div>

                <div className="w-full border-t border-zinc-100 dark:border-zinc-800 pt-4">
                    <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-3 block text-center">-- OR USE BULLET LIST --</label>
                    <BulletListEditor
                        items={data.highlights || []}
                        onChange={handleHighlightsChange}
                    />
                </div>
            </div>
        </div>
    );
});

import React, { memo } from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface BulletListEditorProps {
    items: string[];
    onChange: (items: string[]) => void;
    placeholder?: string;
}

export const BulletListEditor: React.FC<BulletListEditorProps> = memo(({ items = [], onChange, placeholder = "Input impact metric..." }) => {

    const handleItemChange = (index: number, value: string) => {
        const newItems = [...items];
        newItems[index] = value;
        onChange(newItems);
    };

    const addItem = () => {
        onChange([...items, ""]);
    };

    const removeItem = (index: number) => {
        const newItems = items.filter((_, i) => i !== index);
        onChange(newItems);
    };

    return (
        <div className="flex flex-col gap-4 mt-8">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">IMPACT_METRICS</label>
                <button
                    onClick={addItem}
                    className="text-[9px] flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100 hover:underline px-2"
                >
                    <Plus size={10} /> ADD_ENTRY
                </button>
            </div>

            <div className="flex flex-col gap-4">
                {items.map((item, index) => (
                    <div key={index} className="flex items-start gap-4 group animate-in slide-in-from-left-2 duration-200">
                        <div className="mt-4 w-1 h-1 bg-zinc-200 dark:bg-zinc-700 shrink-0" />
                        <textarea
                            className="flex-1 bg-transparent border-none p-0 text-[10px] outline-none text-zinc-800 dark:text-zinc-200 resize-none min-h-[20px] placeholder:text-zinc-300 dark:placeholder:text-zinc-700 leading-relaxed font-mono"
                            value={item}
                            onChange={(e) => handleItemChange(index, e.target.value)}
                            placeholder={placeholder}
                            rows={1}
                            onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = 'auto';
                                target.style.height = target.scrollHeight + 'px';
                            }}
                        />
                        <button
                            onClick={() => removeItem(index)}
                            className="p-1 text-zinc-200 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                ))}
                {items.length === 0 && (
                    <div className="border border-zinc-100 dark:border-zinc-900 p-8 text-center bg-zinc-50/30 dark:bg-black/30">
                        <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">NO_DATA_LOGGED</p>
                    </div>
                )}
            </div>
        </div>
    );
});

import React, { memo } from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface BulletListEditorProps {
    items: string[];
    onChange: (items: string[]) => void;
    placeholder?: string;
}

export const BulletListEditor: React.FC<BulletListEditorProps> = memo(({ items = [], onChange, placeholder = "Add achievement..." }) => {

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
        <div className="flex flex-col gap-4 mt-6">
            <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Achievements & Impact</label>
                <button
                    onClick={addItem}
                    className="text-[10px] flex items-center gap-1.5 font-bold text-primary hover:bg-secondary px-3 py-1.5 rounded-lg border border-border shadow-sm transition-all"
                >
                    <Plus size={12} /> ADD ITEM
                </button>
            </div>

            <div className="flex flex-col gap-3">
                {items.map((item, index) => (
                    <div key={index} className="flex items-start gap-3 group animate-in">
                        <div className="mt-3 w-1.5 h-1.5 rounded-full bg-primary/20 shrink-0" />
                        <textarea
                            className="flex-1 bg-secondary/30 dark:bg-zinc-800/50 border border-border/50 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-foreground resize-none min-h-[38px] placeholder:text-muted-foreground/50"
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
                            className="mt-2 p-1.5 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
                {items.length === 0 && (
                    <div className="border border-dashed border-border rounded-xl p-6 text-center">
                        <p className="text-xs text-muted-foreground font-medium italic">No achievements added. Click "+" to start adding impact points.</p>
                    </div>
                )}
            </div>
        </div>
    );
});

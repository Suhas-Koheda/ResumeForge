import React from 'react';
import { BlockType } from '@shared/types';

interface SidebarProps {
    BLOCK_BUTTONS: { type: BlockType; label: string; icon: React.ElementType }[];
    addBlock: (type: BlockType) => string;
}

export const Sidebar: React.FC<SidebarProps> = ({ BLOCK_BUTTONS, addBlock }) => {
    return (
        <aside className="w-full sm:w-16 h-14 sm:h-auto border-b sm:border-b-0 sm:border-r border-zinc-200 dark:border-[#2d3042] bg-white/95 dark:bg-[#1e2028]/95 backdrop-blur-md flex sm:flex-col items-center justify-start sm:justify-start py-2 sm:py-6 gap-2 sm:gap-8 z-10 shrink-0 shadow px-4 sm:px-0 overflow-x-auto no-scrollbar">
            {BLOCK_BUTTONS.map(({ type, icon: Icon }) => (
                <button 
                    key={type} 
                    onClick={() => addBlock(type)} 
                    className="group relative flex flex-col items-center gap-1 text-zinc-400 dark:text-zinc-500 hover:text-black dark:hover:text-zinc-100 transition-all font-bold shrink-0"
                >
                    <div className="w-10 h-10 rounded-lg border border-zinc-100 dark:border-[#2d3042] flex items-center justify-center group-hover:border-black dark:group-hover:border-zinc-500 transition-all">
                        <Icon size={16} strokeWidth={1.5} />
                    </div>
                </button>
            ))}
        </aside>
    );
};

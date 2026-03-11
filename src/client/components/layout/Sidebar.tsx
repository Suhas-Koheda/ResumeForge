import React from 'react';
import { BlockType } from '@shared/types';

interface SidebarProps {
    BLOCK_BUTTONS: { type: BlockType; label: string; icon: React.ElementType }[];
    addBlock: (type: BlockType) => string;
}

export const Sidebar: React.FC<SidebarProps> = ({ BLOCK_BUTTONS, addBlock }) => {
    return (
        <aside className="w-full sm:w-16 h-14 sm:h-auto border-b sm:border-b-0 sm:border-r border-zinc-200 dark:border-[#2d3042] bg-white/95 dark:bg-[#1e2028]/95 backdrop-blur-md flex sm:flex-col items-center justify-start sm:justify-start py-2 sm:py-6 gap-2 sm:gap-8 z-10 shrink-0 shadow px-4 sm:px-0 overflow-x-auto no-scrollbar">
             {BLOCK_BUTTONS.map(({ type, label, icon: Icon }) => (
                <button 
                    key={type} 
                    onClick={() => addBlock(type)} 
                    className="group relative flex flex-col items-center justify-center p-2 text-zinc-400 dark:text-zinc-500 hover:text-black dark:hover:text-zinc-100 transition-all font-bold shrink-0"
                >
                    <div className="w-10 h-10 rounded-lg border border-zinc-100 dark:border-[#2d3042] flex items-center justify-center group-hover:border-black dark:group-hover:border-zinc-500 transition-all">
                        <Icon size={18} strokeWidth={1.5} />
                    </div>
                    {/* Tooltip Label - only visible on hover */}
                    <div className="absolute left-full ml-4 px-3 py-1 bg-black text-white text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all pointer-events-none whitespace-nowrap z-50 rounded hidden sm:block shadow-xl">
                        {label}
                        <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-r-4 border-r-black"></div>
                    </div>
                </button>
            ))}
        </aside>
    );
};

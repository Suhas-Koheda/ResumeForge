import React, { useState } from 'react';
import { useResumeActions } from '../../hooks/useResume';
import { FileText, Plus, Trash2, X, ChevronRight, File } from 'lucide-react';
import toast from 'react-hot-toast';

export const FileExplorer: React.FC = () => {
    const {
        projectFiles,
        activeFileName,
        setActiveFileName,
        addFile,
        deleteFile
    } = useResumeActions();

    const [newFileName, setNewFileName] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleAddFile = () => {
        if (newFileName && !projectFiles.find(f => f.name === newFileName)) {
            addFile(newFileName);
            setNewFileName('');
            setIsAdding(false);
        }
    };

    return (
        <div className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#111215] flex flex-col h-full overflow-hidden">
            <header className="h-10 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-3 bg-white dark:bg-[#1e2028]">
                <h3 className="text-[14px] font-black uppercase tracking-widest text-zinc-500">Project_Files</h3>
                <button
                    onClick={() => setIsAdding(true)}
                    className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
                >
                    <Plus size={14} className="text-zinc-400 hover:text-black dark:hover:text-white" />
                </button>
            </header>

            <div className="flex-1 overflow-y-auto p-2">
                {isAdding && (
                    <div className="flex items-center gap-1 mb-2">
                        <input
                            autoFocus
                            className="flex-1 text-[13px] bg-white dark:bg-black border border-blue-500 rounded px-2 py-1 outline-none"
                            placeholder="filename.tex"
                            value={newFileName}
                            onChange={(e) => setNewFileName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddFile()}
                            onBlur={() => !newFileName && setIsAdding(false)}
                        />
                        <button onClick={handleAddFile} className="p-1 text-blue-500"><Plus size={14} /></button>
                        <button onClick={() => setIsAdding(false)} className="p-1 text-zinc-400"><X size={14} /></button>
                    </div>
                )}

                <div className="space-y-0.5">
                    {projectFiles.map((file) => (
                        <div
                            key={file.name}
                            className={`group flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-all ${activeFileName === file.name
                                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20'
                                    : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5'
                                }`}
                            onClick={() => setActiveFileName(file.name)}
                        >
                            <div className="flex items-center gap-2 overflow-hidden">
                                {file.name.endsWith('.tex') ? <FileText size={14} /> : <File size={14} />}
                                <span className="text-[14px] truncate whitespace-nowrap">{file.name}</span>
                            </div>
                            {file.name !== 'main.tex' && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toast((t) => (
                                            <div className="flex items-center gap-3">
                                                <span className="text-[13px] font-bold uppercase tracking-widest text-[#1e2028]">Delete {file.name}?</span>
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => { deleteFile(file.name); toast.dismiss(t.id); }}
                                                        className="px-2 py-1 bg-red-500 text-white rounded text-[8px] font-black uppercase"
                                                    >
                                                        Confirm
                                                    </button>
                                                    <button 
                                                        onClick={() => toast.dismiss(t.id)}
                                                        className="px-2 py-1 bg-zinc-200 text-zinc-600 rounded text-[8px] font-black uppercase"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ), { duration: 5000, position: 'top-center' });
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"
                                >
                                    <Trash2 size={12} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

import React, { useState } from 'react';
import { FileCode, Plus, Trash2, ChevronRight, ChevronDown, FileText, Upload } from 'lucide-react';
import { useBuilderStore } from '../../store/useBuilderStore';
import toast from 'react-hot-toast';

export interface FileNode {
  path: string;
  name: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

interface FileTreeProps {
  onFileSelect: (path: string) => void;
  activeFile?: string;
}

export function FileTree({ onFileSelect, activeFile }: FileTreeProps) {
    const { projectFiles, addFile, deleteFile, updateFileContent } = useBuilderStore();
    const [expanded, setExpanded] = useState<Record<string, boolean>>({ '.': true });
    const [isAdding, setIsAdding] = useState(false);
    const [newFileName, setNewFileName] = useState('');

    const getFileTree = (): FileNode[] => {
        const root: FileNode[] = [];
        projectFiles.forEach((file: any) => {
            const parts = file.name.split('/');
            let currentLevel = root;
            parts.forEach((part: string, index: number) => {
                const isLast = index === parts.length - 1;
                let node = currentLevel.find(n => n.name === part);
                if (!node) {
                    node = {
                        path: parts.slice(0, index + 1).join('/'),
                        name: part,
                        type: isLast ? 'file' : 'directory',
                        children: isLast ? undefined : []
                    };
                    currentLevel.push(node);
                }
                if (node.children) {
                    currentLevel = node.children;
                }
            });
        });
        return root;
    };

    const tree = getFileTree();

    const toggleFolder = (path: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setExpanded(prev => ({ ...prev, [path]: !prev[path] }));
    };

    const handleCreateFile = () => {
        if (newFileName) {
            if (!newFileName.endsWith('.tex') && !newFileName.endsWith('.cls') && !newFileName.endsWith('.sty')) {
                toast.error('Use .tex, .cls, or .sty');
                return;
            }
            addFile(newFileName);
            updateFileContent(newFileName, '% New LaTeX file\n', 'system');
            setNewFileName('');
            setIsAdding(false);
            toast.success(`Created ${newFileName}`);
        } else {
            setIsAdding(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const content = event.target?.result as string;
                addFile(file.name);
                updateFileContent(file.name, content, 'system');
                toast.success(`Uploaded ${file.name}`);
            } catch (err: any) {
                toast.error(`Upload failed: ${err.message}`);
            }
        };

        if (file.type.startsWith('image/') || file.type === 'application/pdf') {
            toast.error("Binary uploads coming soon!");
        } else {
            reader.readAsText(file);
        }
        e.target.value = '';
    };

    const handleDelete = async (path: string, e: React.MouseEvent) => {
        e.stopPropagation();
        toast((t) => (
            <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#1e2028]">Delete {path}?</span>
                <div className="flex gap-2">
                    <button 
                        onClick={() => { deleteFile(path); toast.dismiss(t.id); toast.success(`Deleted ${path}`); }}
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
    };

    const renderNode = (node: FileNode, depth: number = 0) => {
        const isExpanded = expanded[node.path];
        const isDirectory = node.type === 'directory';
        const isActive = activeFile === node.path;

        return (
            <div key={node.path} className="select-none">
                <div 
                    className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer group transition-colors ${
                        isActive 
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-r-2 border-blue-500' 
                            : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                    onClick={() => isDirectory ? toggleFolder(node.path) : onFileSelect(node.path)}
                    style={{ paddingLeft: `${depth * 12 + 12}px` }}
                >
                    <div className="w-4 h-4 flex items-center justify-center">
                        {isDirectory ? (
                            <span onClick={(e) => toggleFolder(node.path, e)}>
                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </span>
                        ) : (
                            <FileCode size={14} className={isActive ? "text-blue-500" : "text-zinc-400"} />
                        )}
                    </div>
                    
                    <span className={`text-[11px] font-bold uppercase tracking-wider truncate ${isActive ? 'font-black' : ''}`}>
                        {node.name}
                    </span>

                    {!isDirectory && (
                        <div className="ml-auto opacity-0 group-hover:opacity-100 flex items-center gap-1">
                            <button 
                                onClick={(e) => handleDelete(node.path, e)}
                                className="p-1 hover:bg-red-500/10 hover:text-red-500 rounded transition-colors"
                                title="Delete File"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    )}
                </div>

                {isDirectory && isExpanded && node.children?.map(child => renderNode(child, depth + 1))}
            </div>
        );
    };

    return (
        <div className="w-64 border-r border-zinc-200 dark:border-[#2d3042] bg-white dark:bg-[#111215] flex flex-col h-full animate-in slide-in-from-left duration-300">
            <div className="h-14 px-4 border-b border-zinc-100 dark:border-[#2d3042] flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/20">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Project_Explorer</h3>
                <div className="flex gap-1">
                        <button 
                                onClick={() => document.getElementById('file-upload-input')?.click()}
                                className="p-1 px-1.5 flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded text-[9px] font-bold uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                                title="Upload Files"
                        >
                                <Upload size={12} />
                        </button>
                        <button 
                                onClick={() => setIsAdding(true)}
                                className="p-1 px-2 flex items-center gap-1 bg-black dark:bg-white text-white dark:text-black rounded text-[9px] font-bold uppercase tracking-widest hover:opacity-80 transition-all font-black"
                        >
                                <Plus size={12} /> NEW
                        </button>
                </div>
                <input 
                        type="file" 
                        id="file-upload-input" 
                        className="hidden" 
                        onChange={handleUpload}
                        accept=".tex,.cls,.sty"
                />
            </div>
            
            <div className="flex-1 overflow-y-auto py-2 no-scrollbar">
                {isAdding && (
                    <div className="px-3 py-2 animate-in slide-in-from-top-2 duration-200">
                        <input
                            autoFocus
                            className="w-full text-[11px] bg-white dark:bg-black border border-blue-500 rounded px-2 py-1.5 outline-none shadow-lg shadow-blue-500/10"
                            placeholder="filename.tex"
                            value={newFileName}
                            onChange={(e) => setNewFileName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateFile()}
                            onBlur={() => !newFileName && setIsAdding(false)}
                        />
                    </div>
                )}
                {projectFiles.length === 0 ? (
                    <div className="p-8 text-center opacity-30 mt-10">
                        <FileText size={40} className="mx-auto mb-4" />
                        <p className="text-[10px] font-bold uppercase tracking-widest">Empty Workspace</p>
                    </div>
                ) : (
                    tree.map(node => renderNode(node))
                )}
            </div>

            <div className="p-4 border-t border-zinc-100 dark:border-[#2d3042] bg-zinc-50/30 dark:bg-zinc-900/10">
                 <div className="flex items-center gap-2 text-[9px] font-bold text-zinc-400 uppercase tracking-widest leading-none">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        Workspace_Active
                 </div>
            </div>
        </div>
    );
}

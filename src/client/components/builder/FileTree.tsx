import React, { useState } from 'react';
import { FileCode, Plus, Trash2, ChevronRight, ChevronDown, FileText, Upload } from 'lucide-react';
import { useFiles, FileNode } from '../../hooks/useFiles';

interface FileTreeProps {
  onFileSelect: (path: string) => void;
  activeFile?: string;
}

export function FileTree({ onFileSelect, activeFile }: FileTreeProps) {
  const { getFileTree, createFile, deleteFile, loading, files } = useFiles();
  const tree = getFileTree();

  const [expanded, setExpanded] = useState<Record<string, boolean>>({ '.': true });

  const toggleFolder = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(prev => ({ ...prev, [path]: !prev[path] }));
  };

  const handleCreateFile = async () => {
    const name = prompt('Enter file name (e.g. section.tex):');
    if (name) {
      if (!name.endsWith('.tex') && !name.endsWith('.cls') && !name.endsWith('.sty')) {
         alert('Invalid extension. Use .tex, .cls, or .sty');
         return;
      }
      try {
        await createFile(name, '% New LaTeX file\n');
      } catch (e: any) {
        alert(e.message);
      }
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const content = event.target?.result as string;
            await createFile(file.name, content);
        } catch (err: any) {
            alert(`Upload failed: ${err.message}`);
        }
    };
    
    if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        alert("Binary file uploads (images/PDF) are coming soon! Only .tex, .cls, and .sty are supported currently.");
    } else {
        reader.readAsText(file);
    }
    // Clear input
    e.target.value = '';
  };

  const handleDelete = async (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete ${path}?`)) {
      try {
        await deleteFile(path);
      } catch (e: any) {
        alert(e.message);
      }
    }
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
          onClick={() => isDirectory ? toggleFolder(node.path, undefined as any) : onFileSelect(node.path)}
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
                onClick={handleCreateFile}
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
        {loading && files.length === 0 ? (
          <div className="p-4 flex flex-col items-center gap-2 opacity-20">
            <div className="w-8 h-8 rounded-full border-2 border-zinc-500 border-t-transparent animate-spin" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Scanning...</span>
          </div>
        ) : tree.length === 0 ? (
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

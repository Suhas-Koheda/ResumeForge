import { useState, useEffect, useCallback } from 'react';
import { fileService } from '../services/files';

export interface FileNode {
  path: string;
  name: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

export function useFiles() {
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshFiles = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fileService.listFiles();
      setFiles(list);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshFiles();
  }, [refreshFiles]);

  const createFile = async (path: string, content: string = '') => {
    await fileService.writeFile(path, content);
    await refreshFiles();
  };

  const deleteFile = async (path: string) => {
    await fileService.deleteFile(path);
    await refreshFiles();
  };

  const renameFile = async (oldPath: string, newPath: string) => {
    await fileService.renameFile(oldPath, newPath);
    await refreshFiles();
  };

  const readFile = async (path: string) => {
    return await fileService.readFile(path);
  }

  const writeFile = async (path: string, content: string) => {
    await fileService.writeFile(path, content);
    // Only refresh if it's a new file (though usually we'd use createFile for that)
    if (!files.includes(path)) {
      await refreshFiles();
    }
  }

  // Helper to convert flat path list to a tree structure if needed
  const getFileTree = useCallback((): FileNode[] => {
    const root: FileNode[] = [];
    files.forEach(filePath => {
      const parts = filePath.split('/');
      let currentLevel = root;
      parts.forEach((part, index) => {
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
  }, [files]);

  return {
    files,
    loading,
    error,
    refreshFiles,
    createFile,
    deleteFile,
    renameFile,
    readFile,
    writeFile,
    getFileTree
  };
}

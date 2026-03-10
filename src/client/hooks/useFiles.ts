import { useState, useEffect, useCallback, useRef } from 'react';
import { fileService } from '../services/files';

export interface FileNode {
  path: string;
  name: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

class FileOperationQueue {
  private queue: Array<() => Promise<void>> = [];
  private processing = false;
  
  async enqueue(operation: () => Promise<void>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          await operation();
          resolve();
        } catch (e) {
          reject(e);
        }
      });
      this.processNext();
    });
  }
  
  private async processNext() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;
    const op = this.queue.shift();
    if (op) {
      await op();
    }
    this.processing = false;
    this.processNext();
  }
}

export function useFiles() {
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Persist queue across re-renders
  const queue = useRef(new FileOperationQueue()).current;

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
    await queue.enqueue(async () => {
      await fileService.writeFile(path, content);
      await refreshFiles();
    });
  };

  const deleteFile = async (path: string) => {
    await queue.enqueue(async () => {
      await fileService.deleteFile(path);
      await refreshFiles();
    });
  };

  const renameFile = async (oldPath: string, newPath: string) => {
    await queue.enqueue(async () => {
      await fileService.renameFile(oldPath, newPath);
      await refreshFiles();
    });
  };

  const readFile = async (path: string) => {
    // Only queue reads if needed, but reads are generally safe and fast if isolated. Keep as is or enqueue. 
    // Usually reads can happen concurrently without corrupting backend state, but we queue to ensure we read after flush
    let content = '';
    await queue.enqueue(async () => {
       content = await fileService.readFile(path);
    });
    return content;
  }

  const writeFile = async (path: string, content: string) => {
    await queue.enqueue(async () => {
      await fileService.writeFile(path, content);
      if (!files.includes(path)) {
        await refreshFiles();
      }
    });
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

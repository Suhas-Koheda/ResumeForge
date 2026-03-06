// src/server/services/fileService.ts
import fs from 'fs/promises';
import path from 'path';

/**
 * Service that manages LaTeX related files (.tex, .cls, .sty, etc.) inside a dedicated workspace.
 * All operations are sandboxed to the `workspaceRoot` directory to prevent path traversal attacks.
 */
export class FileService {
  /** Root directory where all user LaTeX files are stored */
  public readonly workspaceRoot: string;

  constructor(workspaceRoot?: string) {
    // Default to a "templates" folder at the project root
    this.workspaceRoot = workspaceRoot ?? path.resolve(process.cwd(), 'templates');
  }

  /** Resolve a user‑provided relative path safely inside the workspace */
  private resolveSafePath(relativePath: string): string {
    // Disallow absolute paths and ".." segments
    if (path.isAbsolute(relativePath) || relativePath.includes('..')) {
      throw new Error('Invalid file path');
    }
    const fullPath = path.resolve(this.workspaceRoot, relativePath);
    if (!fullPath.startsWith(this.workspaceRoot)) {
      // Extra safety net – should never happen because of the checks above
      throw new Error('Path escapes workspace');
    }
    return fullPath;
  }

  /** List all files (recursively) inside the workspace */
  async listFiles(): Promise<string[]> {
    const walk = async (dir: string): Promise<string[]> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const files: string[] = [];
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...(await walk(full)));
        } else {
          files.push(path.relative(this.workspaceRoot, full));
        }
      }
      return files;
    };
    return walk(this.workspaceRoot);
  }

  async readFile(relativePath: string): Promise<string> {
    const fullPath = this.resolveSafePath(relativePath);
    return fs.readFile(fullPath, 'utf8');
  }

  async writeFile(relativePath: string, content: string): Promise<void> {
    const fullPath = this.resolveSafePath(relativePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf8');
  }

  async deleteFile(relativePath: string): Promise<void> {
    const fullPath = this.resolveSafePath(relativePath);
    await fs.unlink(fullPath);
  }

  async renameFile(oldPath: string, newPath: string): Promise<void> {
    const oldFull = this.resolveSafePath(oldPath);
    const newFull = this.resolveSafePath(newPath);
    await fs.mkdir(path.dirname(newFull), { recursive: true });
    await fs.rename(oldFull, newFull);
  }
}

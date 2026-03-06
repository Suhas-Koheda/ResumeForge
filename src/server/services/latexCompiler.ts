import { spawn } from 'child_process';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

import { templateCompiler } from './templateCompiler.js';

export interface CompilationError {
  line: number;
  message: string;
  context: string;
  suggestion: string;
}

export interface CompilationResult {
  success: boolean;
  pdf?: Buffer;
  logs: string;
  errors: CompilationError[];
  warnings: string[];
  metrics: {
    compilationTime: number;
    pages: number;
    warnings: number;
  };
}

export interface CompileOptions {
  timeout?: number;
  cache?: boolean;
}

const TECTONIC_BIN = (() => {
  const isWin = process.platform === 'win32';
  const binName = isWin ? 'tectonic.exe' : 'tectonic';
  const rootPath = path.resolve(process.cwd(), '.bin', binName);
  if (fsSync.existsSync(rootPath)) return rootPath;
  const fallbackPath = path.resolve(process.env.LAMBDA_TASK_ROOT || process.cwd(), '.bin', binName);
  if (fsSync.existsSync(fallbackPath)) return fallbackPath;
  return binName;
})();

class LatexCompiler {
  private cache: Map<string, CompilationResult> = new Map();

  async compile(files: { name: string; content: string }[], options: CompileOptions & { workspacePath?: string } = {}): Promise<CompilationResult> {
    const start = Date.now();
    const mainFile = files.find(f => f.name === 'main.tex') || files[0];
    if (!mainFile) {
      throw new Error("No files provided for compilation");
    }

    // Preprocess only the main file for now (or all files if they contain placeholders)
    const processedMain = await templateCompiler.preprocess(mainFile.content);
    const hash = this.getHash(JSON.stringify(files) + (options.workspacePath || ''));

    if (options.cache !== false) {
      const cached = this.getCachedResult(hash);
      if (cached) return cached;
    }

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'latex-compile-'));
    const texPath = path.join(tempDir, mainFile.name);
    const pdfPath = path.join(tempDir, mainFile.name.replace('.tex', '.pdf'));
    const logPath = path.join(tempDir, mainFile.name.replace('.tex', '.log'));

    try {
      // Write provided files to the temp directory
      for (const file of files) {
        const content = file.name === mainFile.name ? processedMain : file.content;
        await fs.writeFile(path.join(tempDir, file.name), content, 'utf8');
      }

      // Automatically pull missing dependencies from workspace if available
      if (options.workspacePath) {
          // Detect potentially missing files (classes, packages, inputs)
          const fileRefs = [
              ...processedMain.matchAll(/\\documentclass(?:\[[^\]]*\])?\{([^}]+)\}/g),
              ...processedMain.matchAll(/\\usepackage(?:\[[^\]]*\])?\{([^}]+)\}/g),
              ...processedMain.matchAll(/\\input\{([^}]+)\}/g),
              ...processedMain.matchAll(/\\include\{([^}]+)\}/g)
          ].map(m => m[1]);

          for (const ref of fileRefs) {
              // Handle multiple packages in one \usepackage{a,b,c}
              const names = ref.split(',').map(n => n.trim());
              for (const name of names) {
                  const possibleExtensions = ['.cls', '.sty', '.tex'];
                  for (const ext of possibleExtensions) {
                      const fileName = name.endsWith(ext) ? name : name + ext;
                      if (!files.some(f => f.name === fileName)) {
                          const fullPath = path.resolve(options.workspacePath, fileName);
                          if (fsSync.existsSync(fullPath)) {
                              const content = await fs.readFile(fullPath, 'utf8');
                              await fs.writeFile(path.join(tempDir, fileName), content, 'utf8');
                          }
                      }
                  }
              }
          }
      }

      const args = [
        texPath,
        '--outdir', tempDir,
        '--keep-logs',
        '--print'
      ];

      const env = {
        ...process.env,
        TECTONIC_CACHE_DIR: path.join(os.tmpdir(), 'tectonic-cache')
      };

      const result = await this.runTectonic(args, env, options.timeout || 30000);

      let pdf: Buffer | undefined;
      if (fsSync.existsSync(pdfPath)) {
        pdf = await fs.readFile(pdfPath);
      }

      let logs = '';
      if (fsSync.existsSync(logPath)) {
        logs = await fs.readFile(logPath, 'utf8');
      }

      const errors = this.analyzeLogs(logs || result.stderr);
      const warnings = this.extractWarnings(logs || result.stderr);

      const compilationResult: CompilationResult = {
        success: !!pdf && errors.length === 0,
        pdf,
        logs: logs || result.stderr || result.stdout,
        errors,
        warnings,
        metrics: {
          compilationTime: Date.now() - start,
          pages: this.extractPageCount(logs),
          warnings: warnings.length
        }
      };

      if (compilationResult.success && options.cache !== false) {
        this.cacheResult(hash, compilationResult);
      }

      return compilationResult;

    } catch (err: any) {
      return {
        success: false,
        logs: err.message,
        errors: [{ line: 0, message: err.message, context: '', suggestion: 'Check if Tectonic is installed.' }],
        warnings: [],
        metrics: {
          compilationTime: Date.now() - start,
          pages: 0,
          warnings: 0
        }
      };
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => { });
    }
  }

  async dryRun(files: { name: string; content: string }[]): Promise<{ valid: boolean; errors: CompilationError[] }> {
    const result = await this.compile(files, { cache: false });
    return {
      valid: result.success,
      errors: result.errors
    };
  }

  attemptAutoFix(latex: string, error: CompilationError): string {
    // Basic auto-fixes
    if (error.message.includes('Undefined control sequence')) {
      const match = error.context.match(/\\([a-zA-Z]+)/);
      if (match) {
        const cmd = match[0];
        // If it's a common missing command, we could inject a fallback
        return latex.replace(/\\documentclass/, `\\providecommand{${cmd}}{}\n\\documentclass`);
      }
    }
    return latex;
  }

  getCachedResult(hash: string): CompilationResult | null {
    return this.cache.get(hash) || null;
  }

  cacheResult(hash: string, result: CompilationResult): void {
    this.cache.set(hash, result);
  }

  analyzeLogs(logs: string): CompilationError[] {
    const errors: CompilationError[] = [];
    const lines = logs.split('\n');

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('! ')) {
        const message = lines[i].substring(2);
        let lineNum = 0;
        let context = '';

        // Try to find line number in subsequent lines
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const lineMatch = lines[j].match(/l\.(\d+)/);
          if (lineMatch) {
            lineNum = parseInt(lineMatch[1]);
            context = lines[j];
            break;
          }
        }

        errors.push({
          line: lineNum,
          message,
          context,
          suggestion: this.suggestFixFromServer(message)
        });
      }
    }

    return errors;
  }

  private extractWarnings(logs: string): string[] {
    const warnings: string[] = [];
    const lines = logs.split('\n');
    lines.forEach(line => {
      if (line.includes('LaTeX Warning:')) {
        warnings.push(line.trim());
      }
    });
    return warnings;
  }

  private extractPageCount(logs: string): number {
    const match = logs.match(/Output written on .* \((\d+) pages?,/);
    return match ? parseInt(match[1]) : 0;
  }

  private suggestFixFromServer(message: string): string {
    if (message.includes('Undefined control sequence')) return 'Check for typos or missing package.';
    if (message.includes('Environment undefined')) return 'Ensure the environment name is correct and package is loaded.';
    if (message.includes('Missing { inserted')) return 'Check for missing opening brace.';
    if (message.includes('Missing } inserted')) return 'Check for missing closing brace.';
    return 'Review LaTeX documentation for this error.';
  }

  private getHash(content: string): string {
    return crypto.createHash('md5').update(content).digest('hex');
  }

  private async runTectonic(args: string[], env: any, timeout: number): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const child = spawn(TECTONIC_BIN, args, { env, timeout });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (d) => stdout += d.toString());
      child.stderr.on('data', (d) => stderr += d.toString());

      child.on('error', (err: any) => {
        if (err.code === 'ENOENT') {
          // Try fallback to system 'tectonic'
          const fallback = spawn('tectonic', args, { env, timeout });
          let fs2 = '', fe2 = '';
          fallback.stdout.on('data', (d) => fs2 += d.toString());
          fallback.stderr.on('data', (d) => fe2 += d.toString());
          fallback.on('close', (code) => {
            if (code === 0) resolve({ stdout: fs2, stderr: fe2 });
            else reject(new Error(`Tectonic fallback failed with code ${code}`));
          });
          fallback.on('error', (fErr) => reject(new Error(`Tectonic not found: ${fErr.message}`)));
        } else {
          reject(err);
        }
      });

      child.on('close', (code) => {
        if (code === 0) resolve({ stdout, stderr });
        else resolve({ stdout, stderr }); // Still resolve to analyze logs if it failed
      });
    });
  }
}

export const latexCompiler = new LatexCompiler();

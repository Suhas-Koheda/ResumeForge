import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

export const latexService = {
    async compileToPdf(latexCode: string): Promise<string> {
        // Check if pdflatex is available locally
        try {
            await execAsync('pdflatex --version');
        } catch {
            throw new Error('PDFLaTeX is not installed on this server. Please download the .TEX file instead.');
        }

        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'latex-'));
        const texPath = path.join(tempDir, 'resume.tex');
        const pdfPath = path.join(tempDir, 'resume.pdf');

        try {
            await fs.writeFile(texPath, latexCode);

            // Execute PDFLaTeX directly. It's better to quote the paths to avoid issues with spaces.
            // Using -halt-on-error to fail fast and -interaction=nonstopmode to continue on non-fatal errors
            const cmd = `pdflatex -interaction=nonstopmode -halt-on-error -output-directory="${tempDir}" "${texPath}"`;
            
            try {
                // First pass
                await execAsync(cmd);
                // Second pass for references/layout
                await execAsync(cmd);
            } catch (execError: any) {
                // If PDF was generated despite errors, we might still want to return it, 
                // but usually a non-zero exit code with -halt-on-error means it failed.
                const stdout = execError.stdout || '';
                const stderr = execError.stderr || '';
                console.error('LaTeX Execution Stdout:', stdout);
                console.error('LaTeX Execution Stderr:', stderr);
                
                // Read the log file if it exists for better debugging
                let logContent = '';
                try {
                    logContent = await fs.readFile(path.join(tempDir, 'resume.log'), 'utf8');
                } catch {}

                throw new Error(`LaTeX compilation failed: ${stderr || 'Check the logs for details.'}\n--- STDOUT ---\n${stdout.slice(-1000)}\n--- LOG ---\n${logContent.slice(-1000)}`);
            }

            // Check if PDF actually exists
            try {
                await fs.access(pdfPath);
            } catch {
                throw new Error('LaTeX ran but no PDF was produced.');
            }

            return pdfPath;
        } catch (error) {
            console.error('LaTeX Service Error:', error);
            throw error;
        }
    }
};

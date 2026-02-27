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

            // Execute PDFLaTeX twice directly from the local environment binaries (stable modern approach)
            await execAsync(`pdflatex -interaction=nonstopmode -output-directory=${tempDir} ${texPath}`);
            await execAsync(`pdflatex -interaction=nonstopmode -output-directory=${tempDir} ${texPath}`);

            return pdfPath;
        } catch (error) {
            console.error('LaTeX Execution Error:', error);
            throw new Error('LaTeX compilation failed. Your environment must have TeXLive or MiKTeX installed.');
        }
    }
};

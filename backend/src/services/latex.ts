import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

export const latexService = {
    async compileToPdf(latexCode: string): Promise<string> {
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'latex-'));
        const texPath = path.join(tempDir, 'resume.tex');
        const pdfPath = path.join(tempDir, 'resume.pdf');

        try {
            // Write the LaTeX code to a temporary file
            await fs.writeFile(texPath, latexCode);

            // Run pdflatex (Expected to be in the Docker environment)
            // We run it twice to resolve references and table of contents
            await execAsync(`pdflatex -interaction=nonstopmode -output-directory=${tempDir} ${texPath}`);

            return pdfPath;
        } catch (error) {
            console.error('LaTeX Compilation Error:', error);
            throw new Error('Failed to compile LaTeX to PDF');
        }
    }
};

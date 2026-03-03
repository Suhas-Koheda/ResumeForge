import { spawn } from 'child_process';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import os from 'os';
// The binary is placed here by scripts/install-tectonic.sh at build time.
// In development it falls back to "tectonic" on the host $PATH.
// Resolve Tectonic binary path - handle both local dev and bundled cloud environments
const TECTONIC_BIN = (() => {
    const isWin = process.platform === 'win32';
    const binName = isWin ? 'tectonic.exe' : 'tectonic';

    // 1. Try absolute path from process.cwd (Root-based path)
    const rootPath = path.resolve(process.cwd(), '.bin', binName);
    if (fsSync.existsSync(rootPath)) return rootPath;

    // 2. Try process.env.LAMBDA_TASK_ROOT or standard Netlify bundle path
    const fallbackPath = path.resolve(process.env.LAMBDA_TASK_ROOT || process.cwd(), '.bin', binName);
    if (fsSync.existsSync(fallbackPath)) return fallbackPath;

    // 3. Fallback to path-based search (requires tectonic to be in system $PATH)
    return binName;
})();

let readyTectonicBin = TECTONIC_BIN;
let isBinPrepared = false;

async function prepareTectonicBin() {
    if (isBinPrepared) return readyTectonicBin;

    // In local dev, if it's already a valid path (absolute or in bin), just use it.
    // Also if we use the system PATH, no prep needed.
    if (!path.isAbsolute(TECTONIC_BIN) || process.platform === 'win32') {
        isBinPrepared = true;
        return readyTectonicBin;
    }

    // Serverless/Cloud logic: copy to /tmp to ensure execution permissions
    try {
        const tmpBin = path.join(os.tmpdir(), 'tectonic-bin');
        try {
            await fs.access(tmpBin, fsSync.constants.X_OK);
        } catch {
            await fs.copyFile(TECTONIC_BIN, tmpBin);
            await fs.chmod(tmpBin, 0o755);
        }
        readyTectonicBin = tmpBin;
    } catch (e) {
        console.warn('Failed to prepare Tectonic binary in /tmp:', e);
    }

    isBinPrepared = true;
    return readyTectonicBin;
}

/** Run Tectonic and collect stdout/stderr */
async function runTectonic(args: string[]): Promise<{ stdout: string; stderr: string }> {
    const binToRun = await prepareTectonicBin();

    return new Promise((resolve, reject) => {
        const IS_SERVERLESS = !!process.env.VERCEL || !!process.env.NETLIFY || process.env.VITE_VERCEL === 'true';
        const cacheDir = IS_SERVERLESS ? path.join(os.tmpdir(), 'tectonic-cache') : path.join(process.cwd(), '.tectonic-cache');

        const env = {
            ...process.env,
            TECTONIC_CACHE_DIR: cacheDir
        };
        const child = spawn(binToRun, args, {
            stdio: ['ignore', 'pipe', 'pipe'],
            env
        });

        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (d: Buffer) => (stdout += d.toString()));
        child.stderr.on('data', (d: Buffer) => (stderr += d.toString()));

        child.on('error', (err) => {
            if ((err as any).code === 'ENOENT' || (err as any).code === 'EACCES') {
                const fallback = spawn('tectonic', args, {
                    stdio: ['ignore', 'pipe', 'pipe'],
                    env
                });
                let fs2 = '', fe2 = '';
                fallback.stdout.on('data', (d: Buffer) => (fs2 += d.toString()));
                fallback.stderr.on('data', (d: Buffer) => (fe2 += d.toString()));
                fallback.on('error', (fallbackErr) => {
                    reject(new Error(`Tectonic is not installed or accessible on this server. Direct run err: ${err.message}. Fallback err: ${fallbackErr.message}.`));
                });
                fallback.on('close', code =>
                    code === 0
                        ? resolve({ stdout: fs2, stderr: fe2 })
                        : reject(new Error(`Tectonic exited ${code}:\n${fe2}\n${fs2}`))
                );
            } else {
                reject(err);
            }
        });

        child.on('close', code => {
            if (code === 0) resolve({ stdout, stderr });
            else reject(new Error(`Tectonic exited ${code}:\n${stderr}\n${stdout}`));
        });
    });
}

export const latexService = {
    /**
     * Compile a LaTeX source string with Tectonic.
     * Returns the resulting PDF as a raw Buffer so the caller can
     * pipe it directly to the HTTP response or write it to disk.
     */
    async compileToPdf(latexCode: string): Promise<Buffer> {
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'latex-'));
        const texPath = path.join(tempDir, 'resume.tex');
        const pdfPath = path.join(tempDir, 'resume.pdf');

        try {
            // ---------------------------------------------------------------
            // Pre-process: neutralise pdfLaTeX-only primitives that cause
            // Tectonic (XeTeX engine) to abort with "Undefined control sequence"
            // ---------------------------------------------------------------
            let source = latexCode;

            // 1. pdfLaTeX primitives
            source = source.replace(/\\pdfgentounicode\s*=\s*\d+/gi, '');
            source = source.replace(/\\pdfglyphtounicode\s*\{[^}]*\}\s*\{[^}]*\}/gi, '');
            source = source.replace(/\\input\s*\{glyphtounicode\}/gi, '');
            source = source.replace(/\\pdf(minorversion|compresslevel|objcompresslevel)\s*=\s*\d+/gi, '');

            // 2. Multi-file commands (Curve and others)
            // Neutralize makerubric/input of unknown local files that aren't provided
            // We keep them as comments or replace them with harmless text to prevent crash
            source = source.replace(/\\makerubric\s*\{([^}]*)\}/gi, '% Rubric: $1 (Flattened by ResumeForge)\n');
            source = source.replace(/\\addbibresource\s*\{[^}]*\}/gi, '% stripped bibresource');
            source = source.replace(/\\mynames\s*\{[^}]*\}/gi, '% stripped custom macro: mynames');
            source = source.replace(/\\DefineBibliographyStrings\s*\{[^}]*\}\s*\{[^}]*\}/gi, '% stripped bib command');
            source = source.replace(/\\prefixmarker\s*\{[^}]*\}/gi, '% stripped custom macro: prefixmarker');
            // 2.5 Injected Fallbacks / Polyfills
            const fallbacks = '\n% ResumeForge Auto-Injection Fallbacks\n' +
                '\\usepackage{etoolbox}\n' +
                '\\usepackage{comment}\n' +
                '\\ifundef{\\includecomment}{\\newcommand{\\includecomment}[1]{\\newenvironment{#1}{}{}}}{\\ignore}\n' +
                '\\ifundef{\\excludecomment}{\\newcommand{\\excludecomment}[1]{\\newenvironment{#1}{\\comment}{\\endcomment}}}{\\ignore}\n' +
                '\\ifundef{\\leftheader}{\\newcommand{\\leftheader}[1]{#1}}{}\n' +
                '\\ifundef{\\rightheader}{\\newcommand{\\rightheader}[1]{#1}}{}\n' +
                '\\ifundef{\\makeheaders}{\\newcommand{\\makeheaders}[1][c]{}}{}\n' +
                '\\ifundef{\\makerubric}{\\newcommand{\\makerubric}[1]{}}{}\n' +
                '\\ifundef{\\photo}{\\newcommand{\\photo}[2][]{}}{}\n' +
                '\\ifundef{\\photoscale}{\\newcommand{\\photoscale}[1]{}}{}\n' +
                '\\ifundef{\\prefixmarker}{\\newcommand{\\prefixmarker}[1]{}}{}\n' +
                '\\ifundef{\\entry}{\\newcommand{\\entry}[2][]{#2}}{}\n' +
                '\\includecomment{fullonly}\n' + // Safety for common missing env
                '\\newif\\ifxetexorluatex\n' +
                '\\xetexorluatextrue\n';

            if (source.includes('\\documentclass')) {
                source = source.replace(/(\\documentclass[^{]*\{[^}]*\})/, '$1' + fallbacks);
            } else {
                source = fallbacks + source;
            }

            source = source.replace(/\\input\s*\{([^}]*)\}/gi, (match, file) => {
                if (file === 'glyphtounicode') return '';
                return `% input: ${file} (Flattened by AI ResumeForge)\n`;
            });
            source = source.replace(/\\photoscale\s*\{[^}]*\}/gi, '% stripped custom macro: photoscale');
            
            // 3. Graphics/External Files
            // Neutralize missing images that would cause "File not found" errors
            source = source.replace(/\\includegraphics\s*(\[[^\]]*\])?\s*\{([^}]*)\}/gi, (match, opts, path) => `% missing image: ${path}`);
            source = source.replace(/\\photo\s*(\[[^\]]*\])?\s*\{([^}]*)\}/gi, (match, opts, path) => `% missing photo: ${path}`);

            // 4. Specific XeTeX/pdfLaTeX conditionals
            // Define ifxetexorluatex if it's used but not defined (common in Curve)
            if (source.includes('ifxetexorluatex') && !source.includes('newif\\ifxetexorluatex')) {
                source = '\\newif\\ifxetexorluatex\n\\xetexorluatextrue\n' + source;
            }

            // 5. Packages not needed for Tectonic/XeTeX
            source = source.replace(/\\usepackage\s*(\[[^\]]*\])?\s*\{inputenc\}/gi, '% stripped inputenc');
            source = source.replace(/\\usepackage\s*(\[[^\]]*\])?\s*\{fontenc\}/gi, '% stripped fontenc');
            source = source.replace(/\\usepackage\s*(\[[^\]]*\])?\s*\{settings\}/gi, '% stripped settings');
            
            await fs.writeFile(texPath, source, 'utf8');

            // ---------------------------------------------------------------
            // Run: tectonic resume.tex --outdir <tempDir> --keep-logs
            //   -Z shell-escape is NOT enabled for security reasons.
            // ---------------------------------------------------------------
            try {
                await runTectonic([
                    texPath,
                    '--outdir', tempDir,
                    '--keep-logs',
                    '--print',
                ]);
            } catch (tecErr: any) {
                // Try to read BOTH .log and the captured stderr for a better error message
                let logContent = '';
                try {
                    logContent = await fs.readFile(path.join(tempDir, 'resume.log'), 'utf8');
                } catch { /* no log produced */ }

                // Extract a human-readable snippet from the log or stderr
                const errorSnippet = (logContent || tecErr.message).split('\n')
                    .filter((l: string) => l.startsWith('!') || l.includes('error:'))
                    .join('\n');

                throw new Error(
                    `LaTeX compilation failed.\n${errorSnippet || tecErr.message}` +
                    (logContent ? `\n\n--- FULL LOG (Tail) ---\n${logContent.slice(-1000)}` : '')
                );
            }

            // ---------------------------------------------------------------
            // Verify and return PDF as Buffer
            // ---------------------------------------------------------------
            try {
                await fs.access(pdfPath);
            } catch {
                throw new Error('Tectonic ran successfully but no PDF was produced.');
            }

            const pdfBuffer = await fs.readFile(pdfPath);
            return pdfBuffer;

        } finally {
            // Always clean up – don't await, fire and forget
            fs.rm(tempDir, { recursive: true, force: true }).catch(() => { });
        }
    },
};

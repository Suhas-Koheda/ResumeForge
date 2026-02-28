import { spawn } from 'child_process';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import os from 'os';
// The binary is placed here by scripts/install-tectonic.sh at build time.
// In development it falls back to "tectonic" on the host $PATH.
// Resolve Tectonic binary path - handle both local dev and bundled cloud environments
const TECTONIC_BIN = (() => {
    // 1. Try absolute path from process.cwd (Root-based path)
    const rootPath = path.resolve(process.cwd(), '.bin/tectonic');
    if (fsSync.existsSync(rootPath)) return rootPath;

    // 2. Try process.env.LAMBDA_TASK_ROOT or standard Netlify bundle path
    const fallbackPath = path.resolve(process.env.LAMBDA_TASK_ROOT || process.cwd(), '.bin/tectonic');
    if (fsSync.existsSync(fallbackPath)) return fallbackPath;

    // 3. Fallback to path-based search (requires tectonic to be in system $PATH)
    return 'tectonic';
})();

/** Run Tectonic and collect stdout/stderr */
function runTectonic(args: string[]): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
        const env = {
            ...process.env,
            TECTONIC_CACHE_DIR: path.join(os.tmpdir(), 'tectonic-cache')
        };
        const child = spawn(TECTONIC_BIN, args, {
            stdio: ['ignore', 'pipe', 'pipe'],
            env
        });

        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (d: Buffer) => (stdout += d.toString()));
        child.stderr.on('data', (d: Buffer) => (stderr += d.toString()));

        child.on('error', (err) => {
            // If the bundled binary is absent, try the $PATH version
            if ((err as any).code === 'ENOENT') {
                const fallback = spawn('tectonic', args, {
                    stdio: ['ignore', 'pipe', 'pipe'],
                    env
                });
                let fs2 = '', fe2 = '';
                fallback.stdout.on('data', (d: Buffer) => (fs2 += d.toString()));
                fallback.stderr.on('data', (d: Buffer) => (fe2 += d.toString()));
                fallback.on('error', () =>
                    reject(new Error('Tectonic is not installed on this server. Please download the .TEX file instead.'))
                );
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

            // \pdfgentounicode=1  – pdflatex only
            source = source.replace(/\\pdfgentounicode\s*=\s*\d+/gi, '');

            // \pdfglyphtounicode{...}{...}  – pdflatex only
            source = source.replace(/\\pdfglyphtounicode\s*\{[^}]*\}\s*\{[^}]*\}/gi, '');

            // \input{glyphtounicode} – pdflatex specific
            source = source.replace(/\\input\s*\{glyphtounicode\}/gi, '');

            // \pdf primitives
            source = source.replace(/\\pdf(minorversion|compresslevel|objcompresslevel)\s*=\s*\d+/gi, '');

            // Packages not needed for Tectonic/XeTeX
            source = source.replace(/\\usepackage\s*(\[[^\]]*\])?\s*\{inputenc\}/gi, '% stripped inputenc');
            source = source.replace(/\\usepackage\s*(\[[^\]]*\])?\s*\{fontenc\}/gi, '% stripped fontenc');

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

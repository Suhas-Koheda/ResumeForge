import { spawn } from 'child_process';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import os from 'os';
import { templateCompiler } from './templateCompiler.js';
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
            // Extract embedded .cls/.sty files, then preprocess
            const { source: cleanedLatex, auxiliaryFiles } = templateCompiler.extractAuxiliaryFiles(latexCode);
            const source = await templateCompiler.preprocess(cleanedLatex);

            // Write any extracted auxiliary files (.cls, .sty)
            for (const aux of auxiliaryFiles) {
                await fs.writeFile(path.join(tempDir, aux.filename), aux.content, 'utf8');
            }

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

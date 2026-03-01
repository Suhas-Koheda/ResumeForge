import os from 'os';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import https from 'https';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BIN_DIR = path.resolve(__dirname, '../.bin');
const CACHE_DIR = path.resolve(__dirname, '../.tectonic-cache');
const VERSION = '0.15.0';

const platform = os.platform();
const arch = os.arch();

let binaryName = 'tectonic';
let filename = '';

if (platform === 'linux') {
    filename = `tectonic-${VERSION}-x86_64-unknown-linux-musl.tar.gz`;
} else if (platform === 'darwin') {
    filename = arch === 'arm64' 
        ? `tectonic-${VERSION}-aarch64-apple-darwin.tar.gz` 
        : `tectonic-${VERSION}-x86_64-apple-darwin.tar.gz`;
} else if (platform === 'win32') {
    binaryName = 'tectonic.exe';
    filename = `tectonic-${VERSION}-x86_64-pc-windows-msvc.zip`;
} else {
    console.error(`❌ Unsupported platform: ${platform}`);
    process.exit(1);
}

const url = `https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%40${VERSION}/${filename}`;

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                downloadFile(response.headers.location, dest).then(resolve).catch(reject);
                return;
            }
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download: ${response.statusCode}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
}

async function install() {
    const TECTONIC_PATH = path.join(BIN_DIR, binaryName);
    
    if (fs.existsSync(TECTONIC_PATH)) {
        console.log(`✅ Tectonic already installed at ${TECTONIC_PATH}`);
        return;
    }

    console.log(`⬇️  Downloading Tectonic ${VERSION} for ${platform}...`);
    if (!fs.existsSync(BIN_DIR)) fs.mkdirSync(BIN_DIR, { recursive: true });

    const archivePath = path.join(BIN_DIR, filename);
    
    try {
        await downloadFile(url, archivePath);
        console.log(`📦 Extracting Tectonic...`);

        if (filename.endsWith('.tar.gz')) {
            execSync(`tar -xzf "${archivePath}" -C "${BIN_DIR}"`);
        } else if (filename.endsWith('.zip')) {
            if (platform === 'win32') {
                execSync(`powershell -Command "Expand-Archive -Path '${archivePath}' -DestinationPath '${BIN_DIR}' -Force"`);
            } else {
                execSync(`unzip -o "${archivePath}" -d "${BIN_DIR}"`);
            }
        }

        fs.unlinkSync(archivePath);
        if (platform !== 'win32') fs.chmodSync(TECTONIC_PATH, 0o755);
        
        console.log(`✅ Tectonic installed to ${TECTONIC_PATH}`);

        // Pre-warm cache
        console.log(`🔥 Pre-warming Tectonic cache...`);
        if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
        
        const dummyTex = path.join(os.tmpdir(), 'dummy.tex');
        fs.writeFileSync(dummyTex, '\\documentclass{article}\\begin{document}Hello\\end{document}');
        
        try {
            const env = { ...process.env, TECTONIC_CACHE_DIR: CACHE_DIR };
            execSync(`"${TECTONIC_PATH}" "${dummyTex}" -o "${os.tmpdir()}"`, { env, stdio: 'ignore' });
            console.log(`✅ Cache pre-warmed at ${CACHE_DIR}`);
        } catch (e) {
            console.log(`⚠️  Cache pre-warming skipped or failed (non-critical)`);
        }

    } catch (error) {
        console.error(`❌ Installation failed: ${error.message}`);
        process.exit(1);
    }
}

install();

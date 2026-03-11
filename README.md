# ResumeForge

A powerful resume builder with a visual block canvas, AI-assisted LaTeX generation, and PDF compilation via Tectonic. Runs fully offline or in multi-user cloud mode.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [How It Works End-to-End](#how-it-works-end-to-end)
3. [Quick Start — Local Mode](#quick-start--local-mode)
4. [Cloud Mode Setup](#cloud-mode-setup)
5. [AI Provider Setup](#ai-provider-setup)
6. [Environment Variables Reference](#environment-variables-reference)
7. [API Reference](#api-reference)
8. [Security Model](#security-model)
9. [Project Structure](#project-structure)
10. [Development Scripts](#development-scripts)
11. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                        Browser                          │
│                                                         │
│   ┌─────────────┐    ┌──────────────┐   ┌──────────┐  │
│   │ Block Canvas│───>│ AI Assembly  │──>│ PDF View │  │
│   │ (Zustand)   │    │ (Gemini/Local│   │ (iframe) │  │
│   └─────────────┘    └──────────────┘   └──────────┘  │
│           │                  │                          │
│           └──────────────────┘                          │
│                     │ REST /api/v1                       │
└─────────────────────┼───────────────────────────────────┘
                       │
┌─────────────────────┼───────────────────────────────────┐
│               Express Server (port 5000)                 │
│                       │                                  │
│   ┌───────────────────┼─────────────────────────┐       │
│   │                   ▼                         │       │
│   │  ┌──────────┐  ┌─────────┐  ┌───────────┐  │       │
│   │  │ Auth     │  │  AI     │  │  LaTeX    │  │       │
│   │  │ Middleware│  │ Service │  │ Compiler  │  │       │
│   │  │ (JWT/Local)  │(Gemini/  │  │ (Tectonic)│  │       │
│   │  └──────────┘  │ Ollama) │  └───────────┘  │       │
│   │                └─────────┘                  │       │
│   └─────────────────────────────────────────────┘       │
│                       │                                  │
│   ┌───────────────────┴──────────────────────────┐      │
│   │         Database (Mode-Dependent)            │      │
│   │  LOCAL: SQLite (local_dev.sqlite)            │      │
│   │  CLOUD: PostgreSQL (Neon / any PG host)      │      │
│   └──────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────┘
```

**Two deployment modes:**

| Feature | Local Mode | Cloud Mode |
|---|---|---|
| Database | SQLite (file-based, zero config) | PostgreSQL (Neon / self-hosted) |
| Authentication | Bypassed — single user | JWT email/password + email verification |
| AI Keys | Stored in `.env` on server | Same, but per-user keys optional |
| File storage | Disk (`/files/` directory) | Disk or cloud storage |
| Access control | None — localhost only | Full RBAC via JWT |

---

## How It Works End-to-End

### 1. Block Canvas (Frontend)

The canvas is a visual drag-and-drop workspace. Each **block** represents a resume section:

- `header` — Name, contact info, links
- `summary` — Professional summary
- `experience` — Job entries with bullet points
- `education` — Degree, institution, dates
- `skills` — Skill groups
- `project` — Project entries
- `other` — Free-form content

All block state is stored in **Zustand** (`useBuilderStore`) which persists to `localStorage` under the key `resume-builder-storage-v6`. Each resume has its own slot in the store.

### 2. Assembly Pipeline

When you click **SYNC & COMPILE**, the following pipeline runs:

```
Blocks + Template
       │
       ▼
1. Local Assembly (LatexBlockManager)
   • Tries to inject block content into known LaTeX
     template placeholders without any API call
   • Succeeds for well-structured templates (Jake's, Curve, etc.)
       │
       ├── success → skip step 2
       │
       ▼
2. AI Assembly (Gemini or Ollama)
   • Sends blocks + template to /api/v1/ai/assemble
   • AI returns a complete, compilable LaTeX document
   • Cleaned and validated before use
       │
       ▼
3. main.tex updated in project files (in-memory + persisted to DB)
       │
       ▼
4. PDF Compilation (Tectonic)
   • All project files sent to /api/v1/export/pdf
   • Tectonic compiles main.tex with any .cls/.sty dependencies
   • Returns PDF blob → displayed in iframe
```

**Cache**: After a successful assembly, the result is cached by a key derived from `blocks + customTemplate`. If you close and reopen the preview without changing anything, the cached PDF is shown instantly — no AI call.

### 3. PDF Compilation

The server uses [Tectonic](https://tectonic-typesetting.github.io/), a modern TeX engine auto-downloaded during `npm install`. It supports multi-file projects — you can upload custom `.cls` or `.sty` files alongside `main.tex` in the file explorer.

### 4. Persistence

- **Auto-save**: Changes to blocks/files trigger a debounced save to the server (`POST /api/v1/resumes`)
- **Local mode**: Saved to `local_dev.sqlite` in the project root
- **Cloud mode**: Saved to PostgreSQL
- **Export**: Download as `.pdf`, `.tex`, or portable `.rf.json` (full project snapshot)

---

## Quick Start — Local Mode

Local mode runs with **zero authentication** and a **local SQLite database**. Everything works offline except the AI (which needs a Gemini API key or a local Ollama install).

### Prerequisites

- **Node.js** 18+ and **npm** 9+
- **Linux/macOS** recommended (Tectonic auto-installs). On Windows, install Tectonic manually.

### Steps

**1. Clone and install**

```bash
git clone <repo-url> resumeforge
cd resumeforge
npm install
# ☝️ This also auto-downloads the Tectonic binary to .bin/tectonic
```

**2. Create your `.env` file**

```bash
cp .env.example .env
```

Edit `.env`:

```env
# ── Mode ──────────────────────────────────────────────
IS_LOCAL=true
VITE_IS_LOCAL=true

# ── AI (pick one) ─────────────────────────────────────
GEMINI_API_KEYS=AIzaSy...yourkey...
GEMINI_MODEL_NAME=gemini-2.5-flash

# ── Optional: Ollama (if using local AI) ──────────────
OLLAMA_MODEL=llama3.2
OLLAMA_BASE_URL=http://localhost:11434
AI_PROVIDER=gemini   # or 'ollama'

# ── Security ──────────────────────────────────────────
JWT_SECRET=any_long_random_string_here
```

**3. Start the dev server**

```bash
npm run dev
```

This starts:
- **Vite** (frontend) on `http://localhost:5173`
- **Express** (backend) on `http://localhost:5000`

Open `http://localhost:5173` in your browser. You're done.

---

## Cloud Mode Setup

Cloud mode adds multi-user authentication, email verification, and PostgreSQL storage.

### Prerequisites

- A **PostgreSQL** database (recommended: [Neon](https://neon.tech) — free tier available)
- An **SMTP provider** for email verification (recommended: [Resend](https://resend.com))
- A server or PaaS (Railway, Render, Fly.io, VPS, etc.)

### Steps

**1. PostgreSQL (Neon)**

1. Create a project at [neon.tech](https://neon.tech)
2. Copy the connection string — it looks like:
   ```
   postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb
   ```
3. Note the host, username, password, and database name separately

**2. Email (Resend)**

1. Sign up at [resend.com](https://resend.com)
2. Create an API key
3. Add a verified sending domain, or use `onboarding@resend.dev` for testing

**3. Set environment variables**

```env
# ── Mode ──────────────────────────────────────────────
IS_LOCAL=false
VITE_IS_LOCAL=false

# ── Database ──────────────────────────────────────────
DB_URL=postgresql://user:password@host:5432/dbname
DB_USERNAME=your_pg_username
DB_PASSWORD=your_pg_password

# ── AI ────────────────────────────────────────────────
GEMINI_API_KEYS=AIzaSy...,AIzaSy...   # comma-separated for rotation
GEMINI_MODEL_NAME=gemini-2.5-flash
AI_PROVIDER=gemini

# ── Auth & Security ───────────────────────────────────
JWT_SECRET=a_very_long_unpredictable_secret_at_least_64_chars

# ── Email ─────────────────────────────────────────────
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=re_yourResendApiKey
SMTP_FROM=noreply@yourdomain.com

# ── App URL (used in email links) ──────────────────────
APP_URL=https://yourdomain.com
```

**4. Build and start**

```bash
npm install
npm run build       # compiles both client and server
npm start           # runs dist/server/index.js
```

The server serves the compiled frontend from `dist/client/` automatically.

**5. Auth flow for users**

```
Register → Email sent with verification link
           ↓
        Click link → Account verified
           ↓
        Login → JWT token issued (24h expiry)
           ↓
        Token sent as Bearer header on all API calls
```

---

## AI Provider Setup

### Gemini (Google)

1. Go to [aistudio.google.com](https://aistudio.google.com) → "Get API Key"
2. Add to `.env`:
   ```env
   GEMINI_API_KEYS=AIzaSy...
   GEMINI_MODEL_NAME=gemini-2.5-flash
   AI_PROVIDER=gemini
   ```
3. For high-volume use, add multiple keys (comma-separated) — the server rotates them automatically

**Available models:**

| Model | Quality | Speed | Notes |
|---|---|---|---|
| `gemini-2.5-flash` | ⭐⭐⭐⭐⭐ | Fast | Recommended |
| `gemini-1.5-flash` | ⭐⭐⭐⭐ | Faster | Stable, good fallback |
| `gemini-1.5-pro` | ⭐⭐⭐⭐⭐ | Slow | Best quality, higher cost |

### Ollama (Fully Local AI — no internet required)

**1. Install Ollama**

```bash
# Linux / macOS
curl -fsSL https://ollama.com/install.sh | sh

# Windows
# Download from https://ollama.com/download
```

**2. Pull a model**

```bash
# Default (tiny, ~1GB RAM, basic quality)
ollama pull deepseek-r1:1.5b

# Recommended for resume generation (~2GB RAM)
ollama pull llama3.2

# Best quality for LaTeX (~5GB RAM)
ollama pull qwen2.5:7b
```

**3. Start Ollama**

```bash
ollama serve
# Runs on http://localhost:11434 by default
```

**4. Configure**

```env
OLLAMA_MODEL=llama3.2
OLLAMA_BASE_URL=http://localhost:11434
AI_PROVIDER=ollama
```

**5. Switch on-the-fly**

Use the **Gemini / Ollama** dropdown in the top header bar to switch providers without restarting the server. The selected provider is sent with every AI request.

> **Note:** Ollama quality depends heavily on the model you choose. `deepseek-r1:1.5b` is fast but may produce inconsistent LaTeX. `llama3.2` or `qwen2.5:7b` are recommended for production use.

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `IS_LOCAL` | ✅ | `true` | `true` = SQLite + no auth. `false` = PostgreSQL + JWT auth |
| `VITE_IS_LOCAL` | ✅ | `true` | Same as above but exposed to the frontend build |
| `GEMINI_API_KEYS` | For AI | — | Comma-separated Gemini API keys |
| `GEMINI_MODEL_NAME` | No | `gemini-2.5-flash` | Gemini model to use |
| `OLLAMA_MODEL` | No | `deepseek-r1:1.5b` | Ollama model name |
| `OLLAMA_BASE_URL` | No | `http://localhost:11434` | Ollama server URL |
| `AI_PROVIDER` | No | `gemini` | Default AI provider (`gemini` or `ollama`) |
| `JWT_SECRET` | Cloud | — | Secret for signing JWTs. Use 64+ random chars |
| `DB_URL` | Cloud | — | PostgreSQL connection string |
| `DB_USERNAME` | Cloud | — | PostgreSQL username |
| `DB_PASSWORD` | Cloud | — | PostgreSQL password |
| `SMTP_HOST` | Cloud | — | SMTP server host |
| `SMTP_PORT` | Cloud | `465` | SMTP server port |
| `SMTP_USER` | Cloud | — | SMTP username |
| `SMTP_PASS` | Cloud | — | SMTP password or API key |
| `SMTP_FROM` | Cloud | — | Sender email address |
| `APP_URL` | Cloud | `http://localhost:5173` | Public URL (used in email verification links) |
| `PORT` | No | `5000` | Express server port |

---

## API Reference

All endpoints are under `/api/v1`. All routes (except `/health`) require auth in cloud mode, and are open in local mode.

### Health

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Returns `{ status, mode, db }` |

### Resumes

| Method | Path | Description |
|---|---|---|
| `GET` | `/resumes` | List all resumes for current user |
| `POST` | `/resumes` | Create or update a resume (upsert by ID) |
| `DELETE` | `/resumes/:id` | Delete a resume |

**Resume body format:**
```json
{
  "id": "optional-existing-id",
  "title": "My Resume",
  "canvasData": {
    "nodes": [...blocks],
    "projectFiles": [...latexFiles],
    "activeFileName": "main.tex",
    "customTemplate": "...",
    "templateOptions": {}
  }
}
```

### AI

| Method | Path | Body | Description |
|---|---|---|---|
| `POST` | `/ai/assemble` | `{ blocks, template, provider }` | Full AI LaTeX assembly |
| `POST` | `/ai/assemble-local` | `{ blocks, template }` | Local (no-AI) assembly |
| `POST` | `/ai/parse` | `{ content, autoSave, title }` | Parse plain text resume into blocks |
| `POST` | `/ai/experience` | `{ text, provider }` | Polish experience bullet points |
| `POST` | `/ai/skills` | `{ text, provider }` | Normalize and group skills |
| `POST` | `/ai/project` | `{ text, provider }` | Polish project description |
| `POST` | `/ai/education` | `{ text, provider }` | Format education entry |
| `POST` | `/ai/command` | `{ prompt, provider }` | Generic AI command (for editor) |
| `POST` | `/ai/edit-file` | `{ content, instruction, workspaceFiles }` | AI-assisted file edit |
| `POST` | `/ai/optimize` | `{ blocks, jd, provider }` | Optimize resume for a job description |

### Export / Compile

| Method | Path | Body | Description |
|---|---|---|---|
| `POST` | `/export/pdf` | `{ files: [{name, content}] }` | Compile LaTeX to PDF via Tectonic |
| `POST` | `/import` | multipart | Import a resume file |

### Auth (Cloud only)

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/register` | Register with email + password |
| `POST` | `/auth/login` | Login, returns JWT token |
| `GET` | `/auth/verify?token=...` | Verify email address |
| `POST` | `/auth/forgot-password` | Send password reset email |
| `POST` | `/auth/reset-password` | Reset password with token |

### Files

| Method | Path | Description |
|---|---|---|
| `POST` | `/files` | Save project files to disk |
| `GET` | `/files/:resumeId` | Load project files from disk |

---

## Security Model

### Local Mode

- **No authentication**: Every request is treated as `local-dev-user`
- **Single-user**: Designed for a developer running the app on their own machine
- **No secrets exposed**: API keys stay in `.env` on the server; the browser never sees them
- **Network**: Bind to `localhost` only — not accessible from the network unless you explicitly expose it

### Cloud Mode

**Authentication:**
- Passwords are hashed with **bcrypt** (cost factor 10) before storage — never stored in plaintext
- Sessions use **JWT tokens** signed with `JWT_SECRET` (HS256), valid for 24 hours
- Tokens are sent as `Bearer` headers — never in cookies, never in URLs
- Email verification is required before login is permitted

**Authorization:**
- Every database query is scoped to `userId` extracted from the JWT — users can never access each other's data
- The `authMiddleware` validates the JWT on every protected endpoint

**Rate Limiting:**
- Express `rate-limit` middleware: **1000 requests per 15 minutes** per IP on all `/api` routes
- Client-side: 100ms minimum delay between consecutive AI requests to prevent double-fires

**Input Validation:**
- Request bodies are validated with **Zod** schemas before processing
- LaTeX compilation runs in a sandboxed Tectonic process — no shell injection possible since files are passed as temp files, not command-line arguments

**Transport:**
- In production, all traffic should go through HTTPS (handled by your reverse proxy / PaaS)
- `helmet.js` sets security headers (XSS protection, no-sniff, etc.)
- CORS is configured to `origin: true` — tighten this to your domain in production:
  ```ts
  // src/server/index.ts
  app.use(cors({ origin: 'https://yourdomain.com', credentials: true }));
  ```

**API Keys:**
- Gemini API keys live only in the server's `.env` — the browser never has direct access
- Multiple keys are supported for rotation; the server cycles through them to avoid rate limits

---

## Project Structure

```
resumeforge/
├── .bin/                    # Tectonic binary (auto-downloaded)
├── .env                     # Your environment config (never commit this)
├── .env.example             # Template for .env
├── local_dev.sqlite         # SQLite database (local mode only)
├── package.json
├── vite.config.ts           # Frontend build config
├── tsconfig.json            # Client TypeScript config
├── tsconfig.server.json     # Server TypeScript config
│
├── src/
│   ├── client/              # React frontend (Vite)
│   │   ├── App.tsx          # Root component, main state + assembly logic
│   │   ├── main.tsx         # Entry point
│   │   ├── components/
│   │   │   ├── blocks/      # Individual block editors (ExperienceBlock, etc.)
│   │   │   ├── builder/     # Canvas, file editor, Monaco editor
│   │   │   ├── layout/      # Header, Sidebar, BuildOutputOverlay
│   │   │   ├── template/    # Template picker and saver
│   │   │   └── ui/          # Auth, Onboarding, Landing
│   │   ├── hooks/
│   │   │   ├── useResume.ts # Action dispatcher (wraps store)
│   │   │   └── useFiles.ts  # File management hook
│   │   ├── services/
│   │   │   ├── ai.ts        # Client AI service (proxies to backend)
│   │   │   ├── latex.ts     # PDF compilation client
│   │   │   ├── manualLatex.ts # Fallback LaTeX generator (no AI)
│   │   │   └── offlineParser.ts # Offline LaTeX parser
│   │   └── store/
│   │       └── useBuilderStore.ts # Zustand global state
│   │
│   ├── server/              # Express backend (Node.js)
│   │   ├── index.ts         # Server entry, middleware, route mounting
│   │   ├── api/v1/          # Route handlers
│   │   │   ├── auth.ts      # Registration, login, verification
│   │   │   ├── resume.ts    # Resume CRUD
│   │   │   ├── export.ts    # PDF compilation endpoint
│   │   │   ├── files.ts     # File storage
│   │   │   ├── import.ts    # Resume import
│   │   │   └── templates.ts # Template management
│   │   ├── core/
│   │   │   ├── auth.ts      # JWT middleware (dual local/cloud mode)
│   │   │   ├── config.ts    # All environment config
│   │   │   ├── database.ts  # TypeORM data source (SQLite / PostgreSQL)
│   │   │   └── encryption.ts# Password hashing helpers
│   │   ├── entities/        # TypeORM entities (Resume, User, Template)
│   │   └── services/
│   │       ├── ai.ts        # Gemini + Ollama AI service
│   │       ├── latexCompiler.ts # Tectonic wrapper
│   │       ├── fileService.ts   # Disk file I/O
│   │       └── parser/      # LaTeX → blocks parser (import flow)
│   │
│   └── shared/              # Code shared between client and server
│       ├── types.ts          # Block types, interfaces
│       ├── template.types.ts # Template option types
│       └── latexBlockManager.ts # Local assembly logic
│
└── scripts/
    └── install-tectonic.js  # Auto-downloads Tectonic binary on npm install
```

---

## Development Scripts

```bash
# Start full dev environment (client + server with hot reload)
npm run dev

# Start only the frontend (Vite)
npm run dev:client

# Start only the backend (tsx watch)
npm run dev:server

# Build for production
npm run build          # builds both client and server
npm run build:client   # Vite → dist/client/
npm run build:server   # tsc → dist/server/

# Run in production (after build)
npm start

# Run tests
npm test

# Type-check without emitting
npx tsc --noEmit
```

---

## Troubleshooting

### Tectonic not found

```bash
# Re-run the install script
node scripts/install-tectonic.js

# Or install system-wide on Linux
wget -qO- https://drop.xetex.io/tectonic-linux-x86_64.tar.gz | tar xz -C .bin/
```

### "Database connection failed" (cloud mode)

- Verify `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` in `.env`
- Check that SSL is accepted: the server uses `rejectUnauthorized: false` for Neon compatibility
- Test the connection string directly: `psql "postgresql://user:pass@host/db"`

### AI returns empty / errors

- **Gemini**: Verify the key at [aistudio.google.com](https://aistudio.google.com). Check you haven't exceeded the free quota.
- **Ollama**: Make sure `ollama serve` is running and the model is pulled (`ollama list`)
- Check the server console for `[SERVER] /ai/assemble failed:` messages

### PDF compilation fails with .cls / .sty errors

Multi-file templates need their class files uploaded. In the app:
1. Click the **terminal icon** (⊞) to open the editor
2. Use the **file explorer** on the left to add new files
3. Paste your `.cls` or `.sty` content and save
4. Click **Compile** to retry

### Port conflict

```bash
# Change the server port in .env
PORT=5001

# Change Vite port in vite.config.ts
server: { port: 5174, proxy: { '/api': 'http://localhost:5001' } }
```

### JWT token errors in cloud mode

- Make sure `JWT_SECRET` is set and identical between restarts
- Tokens expire after 24 hours — the user must re-login
- In browser DevTools → Application → Local Storage, clear `resume-builder-storage-v6` if you see stale state

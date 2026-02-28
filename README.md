# 🛠️ ResumeForge

A professional LaTeX resume generator with an AI-powered node-based editor. Built for speed, precision, and high-impact career documents.

## 🚀 Deployment (Cloud Mode)

This project is optimized for deployment on **Netlify** (Frontend + Functions) and **Neon** (Postgres).

### 1. Database (Neon)
- Create a project on [Neon.tech](https://neon.tech).
- Grab your **Connection String**.
- The schema is automatically created on first run (via TypeORM).

### 2. Deployment (Netlify)
- Connect your repo to Netlify.
- The `netlify.toml` automatically handles:
  - **Tectonic Installation**: Downloads the standalone TeX engine.
  - **API Routing**: Redirects `/api/*` to serverless functions.
  - **Verification Logs**: Check your build logs for "🚀 Tectonic verification successful" to ensure the PDF engine is ready.
  - **Environment Variables**: Add these in Netlify:
    - `DB_URL`: Your Neon connection string.
    - `GEMINI_API_KEY`: Your Google AI Key for polishing.
    - `JWT_SECRET`: Random string for Auth.
    - `NETLIFY`: `true`

## 💻 Local Development

1. **Clone & Install**:
   ```bash
   npm install
   ```
2. **Environment Setup**:
   Copy `.env.example` to `.env` and fill in your keys.
3. **Run Dev**:
   ```bash
   npm run dev
   ```
   *Note: Locally, it uses SQLite and assumes `tectonic` is in your PATH. If you don't have it, PDF exports will fail but `.tex` downloads will work.*

## 🏗️ Tech Stack

- **Client**: React + TailwindCSS + Lucide + @dnd-kit
- **Server**: Node.js + Express
- **ORM**: TypeORM (Dual-support for SQLite/Postgres)
- **Engine**: [Tectonic](https://tectonic-typesetting.github.io/) (Self-contained TeX engine)
- **AI**: Google Gemini 1.5 Flash

## 📄 License
MIT

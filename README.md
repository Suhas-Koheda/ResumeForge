# ResumeForge

A professional LaTeX resume generator with an AI-powered node-based visual editor. Built for speed, precision, and high-impact career documents.

## Table of Contents
- [Features](#features)
- [Local Development](#local-development)
  - [Installation](#1-installation)
  - [Environment Setup](#2-environment-setup)
  - [Running the Server & Local Network Access](#3-running-the-server--local-network-access)
  - [Local Requirements](#4-local-requirements)
- [Cloud Deployment](#cloud-deployment)
  - [Cloud Architecture & Security](#cloud-architecture--security)
  - [Deployment Steps (e.g., Netlify)](#deployment-steps-eg-netlify)
- [Technology Stack & Open Source Packages](#technology-stack--open-source-packages)
- [Security Best Practices Implemented](#security-best-practices-implemented)
- [License](#license)

---

## Features
- **Visual Node Editor**: Drag-and-drop resume sections.
- **AI Neural Polisher**: Uses Google Gemini to polish bullet points and experience metrics.
- **Live PDF Preview**: Compiles LaTeX to PDF in real-time.
- **Source Editor**: Manually edit the generated LaTeX source.
- **Local Network Sync**: Seamlessly edit on your desktop and view on your mobile phone across your local network.

---

## Local Development

Local development is designed to be completely frictionless. By default, it uses a local SQLite database and bypasses authentication for seamless testing across devices.

### 1. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 2. Environment Setup
Copy `.env.example` to `.env`. For local development, ensure you have:
```env
IS_LOCAL=true
GEMINI_API_KEYS=["your_gemini_key_here"]
```
*Note: `IS_LOCAL=true` is critical. It tells the app to use SQLite, disable standard authentication, and enable local network syncing.*

### 3. Running the Server & Local Network Access
To run the server and expose it to your local network (so you can preview it on your mobile phone):
```bash
npm run dev -- --host
```
- **Desktop**: Open the `Local` link (e.g., `http://localhost:5173`).
- **Mobile**: Open the `Network` link (e.g., `http://192.168.x.x:5173`).
- **How it works**: When `IS_LOCAL=true`, the app automatically authenticates as a "Local Dev User". If you open the app on your phone via the network link, it will fetch the data from the SQLite database running on your desktop, allowing real-time cross-device editing! Data syncs seamlessly without requiring a login.

### 4. Local Requirements
- **Tectonic**: For local PDF compilation to work, you must have [Tectonic](https://tectonic-typesetting.github.io/) installed and available in your system's PATH. If not, the app will still generate the `.tex` source and let you download it, but the live PDF preview will fail.

---

## Cloud Deployment

Cloud deployment involves full authentication and a robust Postgres database for multi-user support. The app is optimized for serverless deployment on platforms like Netlify or Vercel.

### Cloud Architecture & Security
- **Auth**: Uses JWT token-based authentication. Users must log in.
- **Database**: Uses PostgreSQL via TypeORM (e.g., Neon.tech, Supabase).
- **Encryption**: Resume data in the database is automatically encrypted/decrypted using AES-256-CBC via the `JWT_SECRET` acting as the encryption key.

### Deployment Steps (e.g., Netlify)
1. Set up a PostgreSQL database and get the connection URL.
2. In your Netlify Environment Variables, add:
   - `DB_URL`: Your Postgres connection string (starts with `postgres://`).
   - `GEMINI_API_KEYS`: JSON array of your Google AI keys.
   - `JWT_SECRET`: A strong, random string used for signing JWTs and encrypting database content.
   - `IS_LOCAL`: `false` (or simply omit it).
3. The `netlify.toml` automatically downloads the standalone Tectonic engine during the build process, enabling serverless PDF compilation.

---

## Technology Stack & Open Source Packages

**Frontend (Client)**
- **React 18** & **Vite**: Core framework and lightning-fast bundler.
- **TailwindCSS**: For scalable, utility-first styling and dark mode.
- **Zustand**: Lightweight global state management (handles blocks, resumes, and UI sync).
- **@dnd-kit/core**: Robust, accessible drag-and-drop functionality for the canvas nodes.
- **react-zoom-pan-pinch**: Handles canvas zooming and panning mechanics.
- **lucide-react**: Clean, modern, consistent icon set.

**Backend (Server)**
- **Express.js**: Lightweight REST API framework routing auth, db, and compiler services.
- **TypeORM**: Handles database schema and migrations. Seamlessly switches between SQLite (local) and Postgres (cloud).
- **@google/generative-ai**: Google's official Gemini SDK for AI text polishing and full resume assembly.
- **jsonwebtoken** & **crypto**: Manages secure access tokens and database AES-256 encryption.

**Engine**
- **[Tectonic](https://tectonic-typesetting.github.io/)**: A self-contained, modern C++ implementation of the TeX/LaTeX engine. Used to compile `.tex` strings directly into PDF buffers in memory on the server, without requiring a massive system-wide TeXLive installation.

---

## Security Best Practices Implemented
1. **AES-256 Encryption at Rest**: The `canvasData` (which holds all user resume content) is encrypted at rest in the database.
2. **JWT Authentication**: Protects cloud routes and scopes queries to the active user.
3. **Helmet & Rate Limiting**: Express middlewares configured to block brute force and common web vulnerabilities.
4. **Local Bypass Protocol**: Secure local testing relies strictly on the `IS_LOCAL` internal `.env` flag matching to disable auth, preventing cloud environments from accidentally exposing data if misconfigured.

## License
MIT

# ResumeForge Core
A unified monorepo designed for zero-friction local development and seamless cloud deployment. No more separate frontend and backend folders—all code lives in a single source tree with shared logic.

## Project Structure
- `src/client`: Frontend UI (React + Vite + Zustand + Dnd-Kit)
- `src/server`: Backend API (Node.js + Express + TypeORM + Postgres)
- `src/shared`: Common types and utility functions

## Unified Development Setup

Running the application locally is highly streamlined. 

### Prerequisites
1. Ensure Node.js (v18+) is installed.
2. Have a PostgreSQL connection string ready (e.g., Neon DB).
3. (Optional) Get a Google Gemini AI API key.

### Getting Started

1. **Install Dependencies**
Run this from the root of the project to install both client and server packages.
```bash
npm install
```

2. **Environment Variables**
Create a `.env` file in the root directory:
```env
PORT=5000
MONGODB_URI=postgresql://user:password@host/db  # Your Postgres connection string
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=super_secret_key
IS_LOCAL=true
ALLOWED_ORIGINS=http://localhost:5173
NODE_ENV=development
```

3. **Run the Application**
This single command parallelizes the Vite builder and the Express server.
```bash
npm run dev
```

- **Client**: `http://localhost:5173`
- **Server**: `http://localhost:5000`

### Local Mode Features
- Authentication is bypassed, allowing immediate access to the workspace.
- The UI defaults to a high-contrast, professional, monochromatic palette.
- Enter your Gemini API key directly into the UI Config (Settings) for fast iterations without modifying backend `.env` variables.

## Production & Deployment

### Build Command
Compile both the frontend and backend for production.
```bash
npm run build
```
This generates:
- `dist/client`: Static React application assets.
- `dist/server`: Compiled Node.js backend.

### Cloud Serving (Vercel/Heroku/Railway)
The server is configured to serve the compiled client in production automatically:
```bash
npm start
```
Make sure to set `IS_LOCAL=false` in your production environment variables to enable Authentication and Server-side API key management.

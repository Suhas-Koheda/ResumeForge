/**
 * Client-side AI service.
 *
 * In local mode the app always delegates to the local Express server, which
 * manages the Gemini API keys and rate-limits.  There is no "direct" client
 * Gemini path — one clean path, always through the backend.
 */

import { ResumeBlock } from '@shared/types';

import { useBuilderStore } from '../store/useBuilderStore';

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || '/api/v1';

// ── Rate limiter (client-side, belt-and-suspenders) ───────────────────────────
let lastRequestTime = 0;
const MIN_API_DELAY_MS = 500;

async function applyRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < MIN_API_DELAY_MS) {
        await new Promise(resolve => setTimeout(resolve, MIN_API_DELAY_MS - elapsed));
    }
    lastRequestTime = Date.now();
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────
async function getAuthHeaders() {
    const token = useBuilderStore.getState().token;
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
}

async function postJson<T = any>(path: string, body: unknown): Promise<T> {
    await applyRateLimit();
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || err.details || `Request failed: ${res.status}`);
    }
    return res.json();
}

async function postText(path: string, body: unknown): Promise<string> {
    await applyRateLimit();
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || err.details || `Request failed: ${res.status}`);
    }
    return res.text();
}

// ── Service ───────────────────────────────────────────────────────────────────
export const geminiService = {
    polishExperience: (rawText: string) =>
        postJson('/ai/experience', { text: rawText }),

    polishSkills: (rawText: string) =>
        postJson('/ai/skills', { text: rawText }),

    polishProject: (rawText: string) =>
        postJson('/ai/project', { text: rawText }),

    polishEducation: (rawText: string) =>
        postJson('/ai/education', { text: rawText }),

    assembleFullResume: (blocks: ResumeBlock[], template: string, _apiKey?: string) =>
        postText('/ai/assemble', { 
            blocks: blocks.filter(b => b.enabled !== false), 
            template 
        }),

    parseResume: (content: string | Blob, _type: 'text' | 'file', _apiKey?: string, autoSave = false, title?: string, id?: string): Promise<any> =>
        postJson('/ai/parse', { content, autoSave, title, id }),

    genericAiCommand: (prompt: string, context: string, _apiKey?: string): Promise<string> =>
        postText('/ai/command', { prompt: `${prompt}\n\nExisting code for context:\n${context}` }),

    editFile: (content: string, instruction: string, workspaceFiles?: { path: string; content: string }[], _apiKey?: string): Promise<string> =>
        postText('/ai/edit-file', { content, instruction, workspaceFiles }),
};

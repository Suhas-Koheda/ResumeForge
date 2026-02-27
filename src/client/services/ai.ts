/**
 * Simple service to interact with Gemini API.
 * In production/cloud mode, it delegates to the backend to use server-side keys.
 * In local mode, it can use the user-provided API key directly.
 */

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:5000/api/v1';

import { ResumeBlock } from '@shared/types';

export const geminiService = {
    async polishExperience(rawText: string, apiKey?: string) {
        // If apiKey is provided, use it directly (Local mode or user-ovveride)
        if (apiKey) {
            const prompt = `
                You are an expert resume writer and LaTeX specialist. 
                Convert the following raw job experience description into professional, high-impact bullet points.
                Input: "${rawText}"
                Return the response in strictly valid JSON format:
                {
                    "polishedPoints": ["Point 1", "Point 2"],
                    "latexCode": "\\\\begin{itemize}\\n  \\\\item ...\\n\\\\end{itemize}"
                }
            `;
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { response_mime_type: "application/json" },
                    }),
                }
            );
            const data = await response.json();
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!content) throw new Error("Failed to get response from Gemini");
            return JSON.parse(content);
        }

        // Cloud mode: Delegate to backend
        const response = await fetch(`${API_BASE_URL}/ai/experience`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: rawText }),
        });
        if (!response.ok) throw new Error("Backend AI service failed");
        return await response.json();
    },

    async assembleFullResume(blocks: ResumeBlock[], template: string, apiKey?: string) {
        if (apiKey) {
            const prompt = `
                You are a LaTeX expert. Populate the template with the nodes.
                Nodes: ${JSON.stringify(blocks)}
                Template: ${template || 'Standard moderncv'}
                Return ONLY the plain LaTeX code.
            `;
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
            });
            const data = await response.json();
            return data.candidates[0].content.parts[0].text;
        }

        const response = await fetch(`${API_BASE_URL}/ai/assemble`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ blocks, template }),
        });
        if (!response.ok) throw new Error("Backend AI assembly failed");
        return await response.text();
    },

    // Simplified fallbacks for other types, defaulting to experience logic or backend
    async polishProject(rawText: string, apiKey?: string) {
        return this.polishExperience(rawText, apiKey);
    },
    async polishEducation(rawText: string, apiKey?: string) {
        return this.polishExperience(rawText, apiKey);
    },
    async polishSkills(rawText: string, apiKey?: string) {
        return this.polishExperience(rawText, apiKey);
    }
};

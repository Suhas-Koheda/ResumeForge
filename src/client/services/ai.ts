/**
 * Simple service to interact with Gemini API.
 * In production/cloud mode, it delegates to the backend to use server-side keys.
 * In local mode, it can use the user-provided API key directly.
 */

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || '/api/v1';
const GEMINI_MODEL_NAME = (import.meta as any).env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';

import { ResumeBlock, BlockType } from '@shared/types';
import { useBuilderStore } from '../store/useBuilderStore';

const getAuthHeaders = (): Record<string, string> => {
    const token = useBuilderStore.getState().token;
    return token
        ? { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
        : { "Content-Type": "application/json" };
};

export const geminiService = {
    async polishExperience(rawText: string, apiKey?: string) {
        // If apiKey is provided, use it directly (Local mode or user-override)
        if (apiKey) {
            const prompt = `
                You are an expert resume writer and LaTeX specialist. 
                Convert the following raw job experience description into professional, high-impact bullet points.
                Input: "${rawText}"
                Return the response in strictly valid JSON format:
                {
                    "polishedPoints": ["Point 1", "Point 2"],
                    "latexCode": "\\\\customItemListStart\\n  \\\\customItem{...}\\n\\\\customItemListEnd"
                }
            `;
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_NAME}:generateContent?key=${apiKey}`,
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
            headers: getAuthHeaders(),
            body: JSON.stringify({ text: rawText }),
        });
        if (!response.ok) throw new Error("Backend AI service failed");
        return await response.json();
    },

    async assembleFullResume(blocks: ResumeBlock[], template: string, apiKey?: string) {
        const enabledBlocks = blocks.filter(b => b.enabled !== false);
        const prompt = `
You are a LaTeX resume builder.
Your task is to take a set of resume blocks (JSON) and a LaTeX template (string) 
to create the final section content.

==================================================
TEMPLATE (LATEX):
${template || 'STRICTLY use standard commands like \\customSubHeading, \\customProject, \\customItem.'}
==================================================
INPUT DATA (JSON):
${JSON.stringify(enabledBlocks)}
==================================================

CORE INSTRUCTIONS:
1. Use the template structure. If the template has placeholders (like [NAME] or {{EXPERIENCE}}), replace them with the data from the blocks.
2. If the template is just a set of macros, use those macros to build the sections based on the blocks provided.
3. Every \\customItemListStart MUST contain at least one \\customItem.
   If no items exist for a section, DO NOT create the list.
4. Output ONLY raw LaTeX section content. No preamble, no \\begin{document}, no markdown fences.
5. Escape all LaTeX special characters: & → \\&, % → \\%, etc.
6. Do NOT invent data. Preserve dates exactly.
7. Return ONLY the final LaTeX text. 
`;
        if (apiKey) {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_NAME}:generateContent?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
            });
            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error("Failed to assemble resume content");
            return text.replace(/```latex\n?|```\n?/g, "").trim();
        }

        const response = await fetch(`${API_BASE_URL}/ai/assemble`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ blocks: enabledBlocks, template }),
        });
        if (!response.ok) throw new Error("Backend AI assembly failed");
        return await response.text();
    },

    async parseResume(content: string | Blob, type: 'text' | 'file', apiKey?: string, autoSave = false, title?: string): Promise<any> {
        const prompt = `
            You are a resume data extractor. 
            Extract all information from the provided ${type === 'text' ? 'text/LaTeX' : 'document'} and return it as an array of ResumeBlock objects.
            
            Supported block types: 'header', 'experience', 'education', 'skills', 'project', 'summary', 'other'.
            
            CRITICAL RULES:
            1. DO NOT make any assumptions or invent data.
            2. You MUST strictly return all available sections. Do not drop a single entry or data point.
            3. For Projects, if a date or time period exists, map it to the "duration" field.
            4. For Experience, map the date or time period to "duration".

            JSON Structure for each type (inside 'data' field):
            - 'header': { "name": "", "email": "", "phone": "", "location": "", "website": "", "linkedin": "", "github": "" }
            - 'experience': { "company": "", "role": "", "duration": "", "location": "", "highlights": ["Point 1", "..."] }
            - 'education': { "school": "", "degree": "", "year": "", "location": "" }
            - 'skills': { "category": "", "skills": "List, separated, by, commas" }
            - 'project': { "title": "", "duration": "", "technologies": "", "highlights": ["Point 1", "..."] }
            - 'summary': { "summary": "Full text of professional description" }
            - 'other': { "title": "CUSTOM TITLE", "highlights": ["Item 1"], "content": "OR plain text if no list" }

            Return ONLY a valid JSON array of objects: [{ "type": BlockType, "data": { ... } }]
        `;

        if (apiKey) {
            let body: any;
            if (type === 'text') {
                body = { contents: [{ parts: [{ text: prompt + "\n\nINPUT:\n" + content }] }] };
            } else {
                throw new Error("File parsing requires text extraction or multimodal support (not implemented in this simplified client service). Please paste the resume or Overleaf LaTeX text.");
            }

            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_NAME}:generateContent?key=${apiKey}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        ...body,
                        generationConfig: { response_mime_type: "application/json" },
                    }),
                });
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error?.message || `API Error ${response.status}`);
                }

                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!text) throw new Error("AI returned empty content. Try again or check your source text.");
                
                try {
                    return JSON.parse(text);
                } catch (e) {
                    // Try to extract JSON if AI returned markdown fences anyway
                    const match = text.match(/\[[\s\S]*\]/);
                    if (match) return JSON.parse(match[0]);
                    throw e;
                }
            } catch (error: any) {
                console.error("[GEMINI_CLIENT] Parsing error:", error);
                throw new Error(error.message || "Failed to parse resume content");
            }
        }

        const response = await fetch(`${API_BASE_URL}/ai/parse`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ content, type, autoSave, title }),
        });
        if (!response.ok) throw new Error("Backend AI parsing failed");
        return await response.json();
    }
};

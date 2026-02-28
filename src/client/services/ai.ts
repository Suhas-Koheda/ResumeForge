/**
 * Simple service to interact with Gemini API.
 * In production/cloud mode, it delegates to the backend to use server-side keys.
 * In local mode, it can use the user-provided API key directly.
 */

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:5000/api/v1';

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
        // If apiKey is provided, use it directly (Local mode or user-ovveride)
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
            headers: getAuthHeaders(),
            body: JSON.stringify({ text: rawText }),
        });
        if (!response.ok) throw new Error("Backend AI service failed");
        return await response.json();
    },

    async assembleFullResume(blocks: ResumeBlock[], template: string, apiKey?: string) {
        const prompt = `
You are a LaTeX resume engine.

CRITICAL: You MUST strictly follow the provided template structure.

You are NOT allowed to:
- Add \\documentclass
- Add \\usepackage
- Redefine any commands
- Add new macros
- Modify formatting
- Add commentary
- Add markdown
- Wrap output in code blocks

You are ONLY allowed to generate SECTION CONTENT using the predefined commands.

The template already defines these commands:
- \\customSubHeading
- \\customProject
- \\customItem
- \\customItemListStart
- \\customItemListEnd
- \\customSubHeadingContentStart
- \\customSubHeadingContentEnd

You MUST use them exactly.

==================================================
INPUT BLOCKS (JSON):
${JSON.stringify(blocks)}
==================================================

RULES:

1. Output ONLY valid LaTeX section content.
2. Do NOT output the header or preamble.
3. Do NOT output \\begin{document} or \\end{document}.
4. Every \\customItemListStart MUST contain at least one \\customItem.
   If no items exist, DO NOT create the list at all.
5. Escape all LaTeX special characters:
   & → \\&
   % → \\%
   $ → \\$
   # → \\#
   _ → \\_
   { → \\{
   } → \\}
6. Use the EXACT structure:
   - Education → use \\customSubHeading
   - Experience → \\customSubHeading + optional item list
   - Projects → \\customProject + optional item list
   - Skills → standard itemize block
   - Achievements → standard itemize block
7. Do NOT invent data.
8. Preserve dates exactly as provided.
9. Use professional concise language.

If no data exists for a section, omit that section entirely.

Return ONLY raw LaTeX.
`;
        if (apiKey) {
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
            headers: getAuthHeaders(),
            body: JSON.stringify({ blocks, template }),
        });
        if (!response.ok) throw new Error("Backend AI assembly failed");
        return await response.text();
    },

    async parseResume(content: string | Blob, type: 'text' | 'file', apiKey?: string): Promise<Partial<ResumeBlock>[]> {
        const prompt = `
            You are a resume data extractor. 
            Extract all information from the provided ${type === 'text' ? 'text/LaTeX' : 'document'} and return it as an array of ResumeBlock objects.
            
            Supported block types: 'header', 'experience', 'education', 'skills', 'project'.
            
            JSON Structure for each type (inside 'data' field):
            - 'header': { "name": "", "email": "", "phone": "", "location": "", "website": "", "linkedin": "", "github": "" }
            - 'experience': { "company": "", "role": "", "duration": "", "location": "", "highlights": ["Point 1", "..."] }
            - 'education': { "school": "", "degree": "", "year": "", "location": "" }
            - 'skills': { "category": "", "skills": "List, separated, by, commas" }
            - 'project': { "title": "", "duration": "", "technologies": "", "highlights": ["Point 1", "..."] }

            Return ONLY a JSON array of objects: [{ "type": BlockType, "data": { ... } }]
        `;

        if (apiKey) {
            let body: any;
            if (type === 'text') {
                body = { contents: [{ parts: [{ text: prompt + "\n\nINPUT:\n" + content }] }] };
            } else {
                // For files, we'd need to convert the blob to base64
                // For simplicity in this local demo/agent environment, we'll suggest the user paste text
                // But let's try to support it if we can find a base64 helper.
                throw new Error("File parsing requires text extraction or multimodal support (not implemented in this simplified client service). Please paste the resume or Overleaf LaTeX text.");
            }

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...body,
                    generationConfig: { response_mime_type: "application/json" },
                }),
            });
            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error("Failed to parse resume content");
            return JSON.parse(text);
        }

        const response = await fetch(`${API_BASE_URL}/ai/parse`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ content, type }),
        });
        if (!response.ok) throw new Error("Backend AI parsing failed");
        return await response.json();
    },

    // Refined Polish calls
    async polishProject(rawText: string, apiKey?: string) {
        return this.polishType('project', rawText, apiKey);
    },
    async polishEducation(rawText: string, apiKey?: string) {
        return this.polishType('education', rawText, apiKey);
    },
    async polishSkills(rawText: string, apiKey?: string) {
        return this.polishType('skills', rawText, apiKey);
    },
    async polishType(type: BlockType, rawText: string, apiKey?: string) {
        if (apiKey) {
            const prompt = `
                You are a career expert. Refine this ${type} entry for a professional resume.
                Input: "${rawText}"
                Return strictly valid JSON:
                {
                    "polishedPoints": [...],
                    "latexCode": "..."
                }
            `;
            // Simplified call (sharing logic)
            return this.polishExperience(rawText, apiKey);
        }
        return (await fetch(`${API_BASE_URL}/ai/${type}`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ text: rawText }),
        })).json();
    }
};

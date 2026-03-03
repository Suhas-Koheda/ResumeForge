/**
 * Simple service to interact with Gemini API.
 * In production/cloud mode, it delegates to the backend to use server-side keys 
 * unless a client-side API key is provided for direct access.
 */

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || '/api/v1';
const GEMINI_MODEL_NAME = (import.meta as any).env.GEMINI_MODEL_NAME || (import.meta as any).env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';

import { ResumeBlock, BlockType } from '@shared/types';
import { useBuilderStore } from '../store/useBuilderStore';

/**
 * Client-side rate limiting to prevent hitting quotas too quickly.
 * Limits to 1 request every 1.5 seconds.
 */
let lastRequestTime = 0;
const MIN_API_DELAY = 1500;

const applyRateLimit = async () => {
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < MIN_API_DELAY) {
        const waitTime = MIN_API_DELAY - elapsed;
        console.log(`[GEN_AI] Rate limiting: waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    lastRequestTime = Date.now();
};

const getAuthHeaders = (): Record<string, string> => {
    const token = useBuilderStore.getState().token;
    return token
        ? { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
        : { "Content-Type": "application/json" };
};

export const geminiService = {
    async polishExperience(rawText: string, apiKey?: string) {
        await applyRateLimit();
        // Direct client-side AI if provided (both local and cloud)
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
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `Gemini API Error: ${response.status}`);
            }

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
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || "Backend AI service failed");
        }
        return await response.json();
    },

    async polishSkills(rawText: string, apiKey?: string) {
        await applyRateLimit();
        if (apiKey) {
            const prompt = `
                Extract and categorize technical skills from the following text.
                Input: "${rawText}"
                Return the response in strictly valid JSON format:
                {
                    "skills": "Category 1: Skill A, Skill B; Category 2: Skill C",
                    "latexCode": "\\\\customItemListStart\\n  \\\\customItem{\\\\textbf{Category 1}{: Skill A, Skill B}}\\n\\\\customItemListEnd"
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
            if (!response.ok) throw new Error("Gemini API Error");
            const data = await response.json();
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
            return JSON.parse(content);
        }

        const response = await fetch(`${API_BASE_URL}/ai/skills`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ text: rawText }),
        });
        if (!response.ok) throw new Error("Backend AI service failed");
        return await response.json();
    },

    async polishProject(rawText: string, apiKey?: string) {
        await applyRateLimit();
        if (apiKey) {
            const prompt = `
                Convert the following project description into professional bullet points.
                Input: "${rawText}"
                Return the response in strictly valid JSON format:
                {
                    "polishedPoints": ["Result 1", "Result 2"],
                    "technologies": "Tech A, Tech B",
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
            if (!response.ok) throw new Error("Gemini API Error");
            const data = await response.json();
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
            return JSON.parse(content);
        }

        const response = await fetch(`${API_BASE_URL}/ai/project`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ text: rawText }),
        });
        if (!response.ok) throw new Error("Backend AI service failed");
        return await response.json();
    },

    async polishEducation(rawText: string, apiKey?: string) {
        await applyRateLimit();
        if (apiKey) {
            const prompt = `
                Extract education details (Institution, Degree, Year) from the following text.
                Input: "${rawText}"
                Return the response in strictly valid JSON format:
                {
                    "school": "University Name",
                    "degree": "Degree Name",
                    "year": "20XX - 20XX",
                    "latexCode": "\\\\customSubHeading{...}{...}{...}"
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
            if (!response.ok) throw new Error("Gemini API Error");
            const data = await response.json();
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
            return JSON.parse(content);
        }

        const response = await fetch(`${API_BASE_URL}/ai/education`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ text: rawText }),
        });
        if (!response.ok) throw new Error("Backend AI service failed");
        return await response.json();
    },

    async assembleFullResume(blocks: ResumeBlock[], template: string, apiKey?: string) {
        await applyRateLimit();
        const enabledBlocks = blocks.filter(b => b.enabled !== false);

        // ── TEMPLATE CLEANING ────────────────────────────────────────────
        // If the user pasted multiple templates (e.g. article + curve), keep only the first.
        let cleanTemplate = (template || '').trim();
        const docClassCount = (cleanTemplate.match(/\\documentclass/g) || []).length;
        if (docClassCount > 1) {
            const firstIdx = cleanTemplate.indexOf('\\documentclass');
            const secondIdx = cleanTemplate.indexOf('\\documentclass', firstIdx + 1);
            // Find \end{document} before the second \documentclass
            const endDocBefore = cleanTemplate.lastIndexOf('\\end{document}', secondIdx);
            if (endDocBefore > firstIdx) {
                cleanTemplate = cleanTemplate.substring(0, endDocBefore + '\\end{document}'.length);
            } else {
                cleanTemplate = cleanTemplate.substring(0, secondIdx).trim();
            }
        }

        // Detect the actual document class
        const docClassMatch = cleanTemplate.match(/\\documentclass(?:\[[^\]]*\])?\{([^}]*)\}/);
        const docClass = docClassMatch ? docClassMatch[1] : 'article';
        const isCurve = docClass === 'curve';
        const standardClasses = ['article', 'report', 'book', 'letter', 'beamer', 'memoir', 'standalone', 'minimal', 'curve'];
        const isCustomClass = !standardClasses.includes(docClass);
        const isFullDocument = cleanTemplate.includes('\\documentclass') || cleanTemplate.includes('\\begin{document}');

        // Strip any embedded .cls/.sty source pasted after \end{document}
        const endDocIdx = cleanTemplate.lastIndexOf('\\end{document}');
        if (endDocIdx > -1) {
            cleanTemplate = cleanTemplate.substring(0, endDocIdx + '\\end{document}'.length);
        }

        const prompt = `
You are a LaTeX resume builder. You produce COMPILABLE LaTeX that works with XeTeX/Tectonic.

==================================================
TEMPLATE (THE SKELETON — use this as visual/structural reference):
${cleanTemplate || 'NO TEMPLATE PROVIDED — use the standard article-class resume format.'}
==================================
INPUT DATA (JSON BLOCKS):
${JSON.stringify(enabledBlocks)}
==================================

DETECTED DOCUMENT CLASS: "${docClass}"
${isCustomClass ? `\nWARNING: "${docClass}" is a CUSTOM class that is NOT available. You MUST convert to \\documentclass[letterpaper,11pt]{article} and replicate the formatting using standard LaTeX commands.\n` : ''}
CRITICAL RULES:
1. DOCUMENT CLASS: ${isCustomClass
    ? `The template uses a custom class "${docClass}" which is NOT available. You MUST use \\documentclass[letterpaper,11pt]{article} instead and replicate the template's visual structure using standard LaTeX (\\section{}, \\begin{itemize}, tabular, etc).`
    : isFullDocument ? `Use \\documentclass{${docClass}} as shown in the template.` : 'Use \\documentclass[letterpaper,11pt]{article}.'}
2. ${isCurve
    ? 'This IS a Curve-class document. You MAY use \\makerubric, \\entry, \\leftheader, \\rightheader, \\makeheaders, \\begin{rubric}, \\begin{fullonly}.'
    : `FORBIDDEN commands (these will crash compilation):
   - \\makerubric, \\begin{rubric}, \\entry, \\leftheader, \\rightheader, \\makeheaders
   - \\makefield, \\personalinfo, \\begin{fullonly}, \\photo, \\photoscale
   ${isCustomClass ? '- Do NOT use any commands from the custom class. Rewrite them as standard LaTeX.' : ''}
   Use standard LaTeX: \\section{}, \\begin{itemize}, \\textbf{}, \\href{}{}, fontawesome5 icons.`}
3. If the template defines custom macros (\\customSubHeading, \\customProject, \\customItem, \\customItemListStart, \\customItemListEnd, \\resumeSubheading, \\resumeProject, \\resumeItem, etc), you MUST define them with \\newcommand in the preamble before using them.
4. Extract ONLY raw text/data from JSON blocks. IGNORE any LaTeX formatting inside JSON values.
5. Output a SINGLE, COMPLETE, SELF-CONTAINED LaTeX document. No \\input{}, no external file references, no custom .cls files.
6. Return ONLY raw LaTeX. No markdown fences, no explanations, no comments about what you did.
`;
        if (apiKey) {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_NAME}:generateContent?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `Gemini API Error: ${response.status}`);
            }

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

    async parseResume(content: string | Blob, type: 'text' | 'file', apiKey?: string, autoSave = false, title?: string, id?: string): Promise<any> {
        await applyRateLimit();
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
                throw new Error("File parsing requires text extraction or multimodal support. Please paste the resume or Overleaf LaTeX text.");
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
            body: JSON.stringify({ content, type, autoSave, title, id }),
        });
        if (!response.ok) throw new Error("Backend AI parsing failed");
        return await response.json();
    }
};


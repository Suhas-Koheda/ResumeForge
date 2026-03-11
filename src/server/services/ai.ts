import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../core/config.js";
import { ResumeBlock } from "../../shared/types.js";

const parseSafeJson = (text: string) => {
    try {
        // 1. Pre-clean: Remove common AI conversational filler and code fences
        let jsonStr = text.replace(/```json\n?|```\n?/g, "").trim();

        // 2. Find the bounds of the JSON structure (either [ and ] or { and })
        const firstBracket = jsonStr.indexOf('[');
        const firstBrace = jsonStr.indexOf('{');
        
        let start = -1;
        let end = -1;

        if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
            start = firstBracket;
            end = jsonStr.lastIndexOf(']');
        } else if (firstBrace !== -1) {
            start = firstBrace;
            end = jsonStr.lastIndexOf('}');
        }

        if (start !== -1 && end !== -1 && end > start) {
            jsonStr = jsonStr.substring(start, end + 1);
        }

        // 3. Fix common Llama issues:
        // - Double backslashes in LaTeX often get messed up
        // - Trailing commas
        jsonStr = jsonStr.replace(/,\s*([\]}])/g, '$1');
        
        // Remove control characters except for common whitespace
        jsonStr = jsonStr.replace(/[\u0000-\u001F\u007F-\u009F]/g, (match) => {
            if (match === '\n' || match === '\r' || match === '\t') return match;
            return '';
        });

        return JSON.parse(jsonStr);
    } catch (e) {
        console.error("[LOG_AI_BACKEND] JSON Parse Error. Raw Text snippet:", text.substring(0, 300) + "...");
        console.error("[LOG_AI_BACKEND] Cleaned String snippet:", text.length > 0 ? text.substring(0, 300) : "EMPTY");
        throw new Error(`AI response invalid: ${e instanceof Error ? e.message : 'Invalid format'}`);
    }
};

let rotationIndex = 0;

/**
 * Execute a task with Ollama.
 */
async function executeWithOllama(prompt: string, modelName: string = config.OLLAMA_MODEL, system?: string): Promise<string> {
    const url = `${config.OLLAMA_BASE_URL}/api/generate`;
    console.log(`[LOG_AI_BACKEND] Connecting to Ollama at: ${url} (Model: ${modelName})`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 600_000); // 10 min timeout for slow models

    try {
        console.log(`[LOG_AI_BACKEND] Sending request to Ollama (timeout: 10m)...`);
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: modelName,
                prompt: prompt,
                system: system,
                stream: false,
                format: 'json',
                options: {
                    temperature: 0.1,
                }
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const error = await response.text();
            console.error(`[LOG_AI_BACKEND] Ollama HTTP Error: ${response.status}`, error);
            throw new Error(`Ollama API error (${response.status}): ${error}`);
        }

        const data = await response.json() as { response: string };
        console.log(`[LOG_AI_BACKEND] Ollama Success. Received ${data.response?.length || 0} chars.`);
        return data.response;
    } catch (error: any) {
        clearTimeout(timeoutId);
        console.error("[LOG_AI_BACKEND] Ollama execution failed details:", {
            name: error.name,
            message: error.message,
            url
        });
        
        if (error.name === 'AbortError') {
            throw new Error("Ollama request timed out on the server side (150s exceeded).");
        }
        
        if (error.message.includes('fetch failed')) {
            throw new Error(`Ollama connection failed (fetch failed). Ensure Ollama is running at ${config.OLLAMA_BASE_URL}. Try checking if it's listening on 127.0.0.1 or localhost.`);
        }
        throw new Error(`Ollama execution failed: ${error.message}`);
    }
}

/**
 * Execute a task with API key rotation and retries for rate limits.
 */
async function executeWithRotation<T>(task: (model: any) => Promise<T>, modelName: string = config.GEMINI_MODEL_NAME): Promise<T> {
    const keys = [...config.GEMINI_API_KEYS].filter(Boolean);
    if (keys.length === 0) throw new Error("No Gemini API keys configured");

    let attempts = 0;
    let lastError: any = null;

    while (attempts < keys.length) {
        const key = keys[rotationIndex % keys.length];
        const client = new GoogleGenerativeAI(key);
        const model = client.getGenerativeModel({ model: modelName });

        try {
            return await task(model);
        } catch (error: any) {
            lastError = error;
            if (error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("Quota exceeded")) {
                console.warn(`[LOG_AI_BACKEND] API Key ${rotationIndex % keys.length} rate limited. Rotating...`);
                rotationIndex++;
                attempts++;
                continue;
            }
            throw error;
        }
    }

    console.error("[LOG_AI_BACKEND] All API keys exhausted (rate limited).");
    throw lastError || new Error("All Gemini API keys are currently rate limited.");
}

async function runAiTask(geminiTask: (model: any) => Promise<string>, userPrompt: string, provider: string = config.AI_PROVIDER, systemPrompt?: string): Promise<string> {
    // Ensure we respect the config default if provider is missing or empty
    let activeProvider = (provider && provider.length > 0) ? provider : config.AI_PROVIDER;

    // Safety fallback: If client explicitly asks for gemini but we have no keys, and the server is configured for ollama, fallback.
    if (activeProvider === 'gemini' && config.GEMINI_API_KEYS.length === 0 && config.AI_PROVIDER === 'ollama') {
        console.warn("[LOG_AI_BACKEND] Client requested Gemini but no keys configured. Falling back to configured Ollama.");
        activeProvider = 'ollama';
    }

    if (activeProvider === 'ollama') {
        return await executeWithOllama(userPrompt, config.OLLAMA_MODEL, systemPrompt);
    } else {
        // For Gemini, we combine system and user prompt if system is present
        const combinedTask = async (model: any) => {
            const finalPrompt = systemPrompt ? `System: ${systemPrompt}\n\nUser: ${userPrompt}` : userPrompt;
            const res = await model.generateContent(finalPrompt);
            return res.response.text();
        };
        return await executeWithRotation(combinedTask);
    }
}

export const aiService = {
    async polishExperience(rawText: string, provider?: string) {
        const systemPrompt = "You are a Resume Writer. Convert the input into professional, high-impact bullet points and LaTeX code. Return ONLY JSON.";
        const userPrompt = `Input: "${rawText}"
Expected JSON: { "polishedPoints": ["Point 1", "Point 2"], "latexCode": "..." }`;
        
        const result = await runAiTask(async (model) => {
            const res = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`);
            return res.response.text();
        }, userPrompt, provider, systemPrompt);
        return JSON.stringify(parseSafeJson(result));
    },

    async polishSkills(rawText: string, provider?: string) {
        const systemPrompt = "Extract and categorize skills into Category: Skill A, Skill B format. Return ONLY JSON.";
        const userPrompt = `Input: "${rawText}"
Expected JSON: { "skills": "...", "latexCode": "..." }`;

        const result = await runAiTask(async (model) => {
            const res = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`);
            return res.response.text();
        }, userPrompt, provider, systemPrompt);
        return JSON.stringify(parseSafeJson(result));
    },

    async polishProject(rawText: string, provider?: string) {
        const systemPrompt = "Convert project descriptions into bullet points and list technologies. Return ONLY JSON.";
        const userPrompt = `Input: "${rawText}"
Expected JSON: { "polishedPoints": ["..."], "technologies": "...", "latexCode": "..." }`;

        const result = await runAiTask(async (model) => {
            const res = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`);
            return res.response.text();
        }, userPrompt, provider, systemPrompt);
        return JSON.stringify(parseSafeJson(result));
    },

    async polishEducation(rawText: string, provider?: string) {
        const systemPrompt = "Extract education details (Institution, Degree, Year). Return ONLY JSON.";
        const userPrompt = `Input: "${rawText}"
Expected JSON: { "school": "...", "degree": "...", "year": "...", "latexCode": "..." }`;

        const result = await runAiTask(async (model) => {
            const res = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`);
            return res.response.text();
        }, userPrompt, provider, systemPrompt);
        return JSON.stringify(parseSafeJson(result));
    },

    async assembleResume(blocks: ResumeBlock[], template: string, provider?: string) {
        let cleanTemplate = (template || '').trim();
        const docClassCount = (cleanTemplate.match(/\\documentclass/g) || []).length;
        if (docClassCount > 1) {
            const firstIdx = cleanTemplate.indexOf('\\documentclass');
            const secondIdx = cleanTemplate.indexOf('\\documentclass', firstIdx + 1);
            const endDocBefore = cleanTemplate.lastIndexOf('\\end{document}', secondIdx);
            if (endDocBefore > firstIdx) {
                cleanTemplate = cleanTemplate.substring(0, endDocBefore + '\\end{document}'.length);
            } else {
                cleanTemplate = cleanTemplate.substring(0, secondIdx).trim();
            }
        }

        const enabledBlocks = blocks.filter(b => b.enabled !== false);
        const systemPrompt = `You are a LaTeX Resume Architect.
Your task is to populate the template with the provided JSON data.
STRICT RULES:
- Return ONLY RAW LaTeX. No markdown backticks. No conversation.
- Escape special characters: & -> \\&, % -> \\%, $ -> \\$, _ -> \\_, # -> \\#.
- Ensure the document is complete and compilable.`;

        const userPrompt = `TEMPLATE:
${cleanTemplate || 'Standard Article Resume Class'}

DATA:
${JSON.stringify(enabledBlocks)}`;

        const result = await runAiTask(async (model) => {
            const res = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`);
            return res.response.text();
        }, userPrompt, provider, systemPrompt);

        let extracted = result;
        const match = result.match(/```(?:latex|tex)?\n([\s\S]*?)```/);
        if (match) {
            extracted = match[1];
        } else {
            extracted = result.replace(/```(?:latex|tex)?\n?|```\n?/g, "");
        }
        return extracted.trim();
    },

    async parseResume(content: string, provider?: string) {
        const systemPrompt = `You are a professional Resume Data Extractor.
Extract data from the input and return ONLY a valid JSON array of ResumeBlock objects.
Block Types: 'header', 'experience', 'education', 'skills', 'project', 'summary', 'other'.

STRUCTURE RULES:
- Return ONLY JSON. No conversation.
- No markdown formatting.
- Map Experience dates to "duration".
- Map Project dates to "duration".
- For "latexCode", extract the original LaTeX fragment exactly.
- Each object MUST have: "type", "data", and "latexCode".`;

        const userPrompt = `Input Content to Parse:
"""
${content}
"""

JSON Structure Example:
[
  {
    "type": "header",
    "data": { "name": "...", "email": "..." },
    "latexCode": "..."
  }
]`;

        const result = await runAiTask(async (model) => {
            const res = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`);
            return res.response.text();
        }, userPrompt, provider, systemPrompt);

        console.log("[LOG_AI_BACKEND] Raw response received:", result.substring(0, 100) + "...");

        const parsed = parseSafeJson(result);
        return JSON.stringify(parsed);
    },

    async optimizeForJD(blocks: ResumeBlock[], jobDescription: string, provider?: string) {
        const prompt = `
                You are an expert resume optimizer. 
                Your task is to take the current resume blocks (JSON) and a Job Description (JD) text.
                Modify the content of each block to better align with the requirements, keywords, and tone of the JD.
                
                CRITICAL RULES:
                1. DO NOT invent fake experiences or credentials. 
                2. Rephrase existing bullets to highlight relevant skills. 
                3. Prioritize keywords from the JD in the 'skills', 'experience', and 'summary' sections.
                4. Maintain the exact same JSON structure.
                5. Return ONLY a valid JSON array of objects representing the optimized blocks.
                
                JOB DESCRIPTION:
                ${jobDescription}
                
                RESUME BLOCKS:
                ${JSON.stringify(blocks)}
            `;
        const result = await runAiTask(async (model) => {
            const res = await model.generateContent(prompt);
            return res.response.text();
        }, prompt, provider);
        return JSON.stringify(parseSafeJson(result));
    },

    async genericAiCommand(prompt: string, provider?: string) {
        const result = await runAiTask(async (model) => {
            const res = await model.generateContent(prompt);
            return res.response.text();
        }, prompt, provider);
        return result.replace(/```latex\n?|```\n?/g, "").trim();
    },

    async editLatexFile(content: string, instruction: string, workspaceFiles?: { path: string, content: string }[], provider?: string) {
        const prompt = `
You are a LaTeX expert. Modify the following LaTeX content based on the instruction.
Maintain the overall structure and document class. Use professional resume formatting.

INSTRUCTION: "${instruction}"

CONTENT TO MODIFY (IF EMPTY, CREATE A NEW RESUME):
${content || 'NO CONTENT - CREATE A FULL PROFESSIONAL ARTICLE-CLASS RESUME'}

STRICT DIRECTIVES:
1. ESCAPING: You MUST escape special fragments: & -> \\&, % -> \\%, $ -> \\$, _ -> \\_, # -> \\#, etc.
2. FULL DOCUMENT: If the input is empty or a partial, return a FULL compilable document starting with \\documentclass and ending with \\end{document}.
3. NO MARKDOWN: Return ONLY the raw LaTeX string.
4. NO CONVERSATION: Return ONLY the code.
`;
        const result = await runAiTask(async (model) => {
            const res = await model.generateContent(prompt);
            return res.response.text();
        }, prompt, provider);

        let extracted = result;
        const match = result.match(/```(?:latex|tex)?\n([\s\S]*?)```/);
        if (match) {
            extracted = match[1];
        } else {
            extracted = result.replace(/```(?:latex|tex)?\n?|```\n?/g, "");
        }
        return extracted.trim();
    }
};

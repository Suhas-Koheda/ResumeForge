import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../core/config.js";
import { ResumeBlock } from "../../shared/types.js";

const parseSafeJson = (text: string) => {
    try {
        // Remove markdown formatting: ```json ... ``` or just ```
        let jsonStr = text.replace(/```json\n?|```\n?/g, "").trim();

        // Try to find a JSON array or object in the response first
        const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
        const objectMatch = jsonStr.match(/\{[\s\S]*\}/);

        // Use the match that appears first/is larger, or fallback to cleaned
        if (arrayMatch && objectMatch) {
            jsonStr = arrayMatch[0].length > objectMatch[0].length ? arrayMatch[0] : objectMatch[0];
        } else if (arrayMatch) {
            jsonStr = arrayMatch[0];
        } else if (objectMatch) {
            jsonStr = objectMatch[0];
        }

        return JSON.parse(jsonStr);
    } catch (e) {
        console.error("[LOG_AI_BACKEND] Failed to parse AI JSON. Raw Output:", text);
        // If it's not JSON, try to return it as a string instead of throwing if possible,
        // or re-throw with better context.
        throw new Error(`AI response was not valid JSON: ${e instanceof Error ? e.message : 'Invalid format'}`);
    }
};

let rotationIndex = 0;

/**
 * Execute a task with Ollama.
 */
async function executeWithOllama(prompt: string, modelName: string = config.OLLAMA_MODEL): Promise<string> {
    try {
        const response = await fetch(`${config.OLLAMA_BASE_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: modelName,
                prompt: prompt,
                stream: false,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Ollama API error (${response.status}): ${error}`);
        }

        const data = await response.json() as { response: string };
        return data.response;
    } catch (error: any) {
        console.error("[LOG_AI_BACKEND] Ollama execution failed:", error.message);
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
            // Check for rate limit error (429)
            if (error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("Quota exceeded")) {
                console.warn(`[LOG_AI_BACKEND] API Key ${rotationIndex % keys.length} rate limited. Rotating...`);
                rotationIndex++; // Switch to next key
                attempts++;
                continue;
            }
            // If it's not a rate limit error, throw immediately
            throw error;
        }
    }

    console.error("[LOG_AI_BACKEND] All API keys exhausted (rate limited).");
    throw lastError || new Error("All Gemini API keys are currently rate limited.");
}

async function runAiTask(geminiTask: (model: any) => Promise<string>, ollamaPrompt: string, provider: string = config.AI_PROVIDER): Promise<string> {
    if (provider === 'ollama') {
        return await executeWithOllama(ollamaPrompt);
    } else {
        return await executeWithRotation(geminiTask);
    }
}

export const aiService = {
    async polishExperience(rawText: string, provider?: string) {
        const prompt = `
            You are an expert resume writer and LaTeX specialist. 
            Convert the following raw job experience description into professional, high-impact bullet points.
            Input: "${rawText}"
            
            Return the response in strictly valid JSON format:
            {
                "polishedPoints": ["Point 1", "Point 2"],
                "latexCode": "\\\\customItemListStart\\n  \\\\customItem{...}\\n\\\\customItemListEnd"
            }
            
            Rules:
            - Output ONLY valid JSON.
            - Do NOT include markdown code fences (\`\`\`json).
            - Do NOT include notes or explanations.
        `;
        const result = await runAiTask(async (model) => {
            const res = await model.generateContent(prompt);
            return res.response.text();
        }, prompt, provider);
        return JSON.stringify(parseSafeJson(result));
    },

    async polishSkills(rawText: string, provider?: string) {
        const prompt = `
            Extract and categorize technical skills from the following text.
            Input: "${rawText}"
            Return the response in strictly valid JSON format:
            {
                "skills": "Category 1: Skill A, Skill B; Category 2: Skill C",
                "latexCode": "\\\\customItemListStart\\n  \\\\customItem{\\\\textbf{Category 1}{: Skill A, Skill B}}\\n\\\\customItemListEnd"
            }
        `;
        const result = await runAiTask(async (model) => {
            const res = await model.generateContent(prompt);
            return res.response.text();
        }, prompt, provider);
        return JSON.stringify(parseSafeJson(result));
    },

    async polishProject(rawText: string, provider?: string) {
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
        const result = await runAiTask(async (model) => {
            const res = await model.generateContent(prompt);
            return res.response.text();
        }, prompt, provider);
        return JSON.stringify(parseSafeJson(result));
    },

    async polishEducation(rawText: string, provider?: string) {
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
        const result = await runAiTask(async (model) => {
            const res = await model.generateContent(prompt);
            return res.response.text();
        }, prompt, provider);
        return JSON.stringify(parseSafeJson(result));
    },

    async assembleResume(blocks: ResumeBlock[], template: string, provider?: string) {
        // ── TEMPLATE CLEANING ──────────────────────────────────
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

        const docClassMatch = cleanTemplate.match(/\\documentclass(?:\[[^\]]*\])?\{([^}]*)\}/);
        const docClass = docClassMatch ? docClassMatch[1] : 'article';
        const isCurve = docClass === 'curve';
        const standardClasses = ['article', 'report', 'book', 'letter', 'beamer', 'memoir', 'standalone', 'minimal', 'curve', 'resume'];
        const isCustomClass = !standardClasses.includes(docClass);
        const isFullDocument = cleanTemplate.includes('\\documentclass');

        // Strip embedded .cls/.sty source after \end{document}
        const endDocIdx = cleanTemplate.lastIndexOf('\\end{document}');
        if (endDocIdx > -1) {
            cleanTemplate = cleanTemplate.substring(0, endDocIdx + '\\end{document}'.length);
        }

        const prompt = cleanTemplate
            ? `You are a LaTeX Template Processor. Your ONLY job is to take the TEMPLATE provided and swap its placeholder data with the JSON DATA.
Output MUST be the full document.

TEMPLATE:
${cleanTemplate}

JSON DATA:
${JSON.stringify(blocks)}

STRICT DIRECTIVES:
1. NO STYLE HALLUCINATION: Use ONLY the structure and macros present in the TEMPLATE.
2. FULL DOCUMENT: Your output MUST be a complete LaTeX document from \\documentclass to \\end{document}.
3. NO MARKDOWN: Output ONLY raw LaTeX. No backticks or explanations.
4. ESCAPING: You MUST escape special fragments: & -> \\&, % -> \\%, $ -> \\$, _ -> \\_, # -> \\#, etc.
5. NO CONVERSATION: Return ONLY the code.`
            : `You are an expert LaTeX Resume Architect.
Create a complete, professional, compilable LaTeX resume using the following JSON DATA.
Use a standard, high-quality resume document class (like article) and professional formatting.

JSON DATA:
${JSON.stringify(blocks)}

DIRECTIVES:
1. FULL DOCUMENT: Output a complete, self-contained LaTeX document from \\documentclass to \\end{document}.
2. NO MARKDOWN: Output ONLY raw LaTeX.
3. ESCAPING: You MUST escape special fragments: & -> \\&, % -> \\%, $ -> \\$, _ -> \\_, # -> \\#, etc.
4. MODERN STYLE: Use professional fonts, clear sections, and good whitespace.`;

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
    },

    async parseResume(content: string, provider?: string) {
        const prompt = `
            You are a resume data extractor. 
            Extract all information from the provided text/LaTeX and return it as a JSON array of ResumeBlock objects.
            
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
            - 'skills': { "category": "", "skills": "List, separated by commas" }
            - 'project': { "title": "", "duration": "", "technologies": "", "highlights": ["Point 1", "..."] }
            - 'summary': { "summary": "Full text of professional description" }
            - 'other': { "title": "CUSTOM TITLE", "highlights": ["Item 1"], "content": "OR plain text if no list" }

            Rules:
            - Output ONLY a valid JSON array of objects: [{ "type": BlockType, "data": { ... } }]
            - Do NOT include markdown code fences (\`\`\`json).
            - Do NOT include any preamble or commentary.
            
            INPUT:
            ${content}
        `;
        const result = await runAiTask(async (model) => {
            const res = await model.generateContent(prompt);
            return res.response.text();
        }, prompt, provider);

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
        return executeWithRotation(async (model) => {
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
4. NO CONVERSATION: Return ONLY the raw code.
`;
            const result = await model.generateContent(prompt);
            const text = result.response.text();
            let extracted = text;
            const match = text.match(/```(?:latex|tex)?\n([\s\S]*?)```/);
            if (match) {
                extracted = match[1];
            } else {
                extracted = text.replace(/```(?:latex|tex)?\n?|```\n?/g, "");
            }
            return extracted.trim();
        });
    }
};

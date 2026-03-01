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

export const aiService = {
    async polishExperience(rawText: string) {
        return executeWithRotation(async (model) => {
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
            const result = await model.generateContent(prompt);
            const textResponse = result.response.text();
            return JSON.stringify(parseSafeJson(textResponse));
        });
    },

    async assembleResume(blocks: ResumeBlock[], template: string) {
        return executeWithRotation(async (model) => {
            const prompt = `
You are a LaTeX resume builder. 
Your task is to take a set of resume blocks (JSON) and a LaTeX template (string) 
to create the final section content.

==================================================
TEMPLATE (LATEX):
${template || 'STRICTLY use standard commands like \\customSubHeading, \\customProject, \\customItem.'}
==================================================
INPUT DATA (JSON):
${JSON.stringify(blocks)}
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
            const result = await model.generateContent(prompt);
            return result.response.text().replace(/```latex\n?|```\n?/g, "").trim();
        });
    },

    async parseResume(content: string) {
        return executeWithRotation(async (model) => {
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
            const result = await model.generateContent(prompt);
            const textResponse = result.response.text();

            console.log("[LOG_AI_BACKEND] Raw response received:", textResponse.substring(0, 100) + "...");

            const parsed = parseSafeJson(textResponse);
            return JSON.stringify(parsed);
        });
    }
};

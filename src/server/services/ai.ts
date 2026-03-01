import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../core/config.js";
import { ResumeBlock } from "../../shared/types.js";

const parseSafeJson = (text: string) => {
    try {
        // Try to find a JSON array or object in the response first
        const arrayMatch = text.match(/\[[\s\S]*\]/);
        const objectMatch = text.match(/\{[\s\S]*\}/);
        
        // Use the match that appears first/is larger, or fallback to cleaned
        let jsonStr = text;
        if (arrayMatch && objectMatch) {
            jsonStr = arrayMatch[0].length > objectMatch[0].length ? arrayMatch[0] : objectMatch[0];
        } else if (arrayMatch) {
            jsonStr = arrayMatch[0];
        } else if (objectMatch) {
            jsonStr = objectMatch[0];
        } else {
            jsonStr = text.replace(/```json\n?|```\n?/g, "").trim();
        }
        
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error("[LOG_AI_BACKEND] Failed to parse AI JSON. Raw Output:", text);
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
            const result = await model.generateContent(prompt);
            return result.response.text();
        });
    },

    async parseResume(content: string) {
        return executeWithRotation(async (model) => {
            const prompt = `
                You are a resume data extractor. 
                Extract all information from the provided text/LaTeX and return it as a JSON array of ResumeBlock objects.
                
                Supported block types: 'header', 'experience', 'education', 'skills', 'project'.
                
                JSON Structure for data field:
                - 'header': { "name": "", "email": "", "phone": "", "location": "", "website": "", "linkedin": "", "github": "" }
                - 'experience': { "company": "", "role": "", "duration": "", "location": "", "highlights": [...] }
                - 'education': { "school": "", "degree": "", "year": "", "location": "" }
                - 'skills': { "category": "", "skills": "Skill1, Skill2, ..." }
                - 'project': { "title": "", "duration": "", "technologies": "", "highlights": [...] }

                Rules:
                - Output ONLY a valid JSON array.
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

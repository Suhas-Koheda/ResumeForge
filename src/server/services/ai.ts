import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../core/config.js";
import { ResumeBlock } from "@shared/types";

const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);

export const aiService = {
    async polishExperience(rawText: string) {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
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
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" } as any
        });
        return result.response.text();
    },

    async assembleResume(blocks: ResumeBlock[], template: string) {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
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
    },

    async parseResume(content: string) {
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const prompt = `
                You are a resume data extractor. 
                Extract all information from the provided text/LaTeX and return it as an array of ResumeBlock objects.
                
                Supported block types: 'header', 'experience', 'education', 'skills', 'project'.
                
                JSON Structure for data field:
                - 'header': { "name": "", "email": "", "phone": "", "location": "", "website": "", "linkedin": "", "github": "" }
                - 'experience': { "company": "", "role": "", "duration": "", "location": "", "highlights": [...] }
                - 'education': { "school": "", "degree": "", "year": "", "location": "" }
                - 'skills': { "category": "", "skills": "Skill1, Skill2, ..." }
                - 'project': { "title": "", "duration": "", "technologies": "", "highlights": [...] }

                Return ONLY a JSON array.
            `;
            const result = await model.generateContent({
                contents: [{ role: "user", parts: [{ text: prompt + "\n\nINPUT:\n" + content }] }],
                generationConfig: { responseMimeType: "application/json" } as any
            });
            const textResponse = result.response.text();
            console.log("[LOG_AI_BACKEND] Raw response received:", textResponse.substring(0, 100) + "...");
            return textResponse;
        } catch (error: any) {
            console.error("[LOG_AI_BACKEND] ERROR in parseResume:", error);
            throw error;
        }
    }
};

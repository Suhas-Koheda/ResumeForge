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
                "latexCode": "\\\\begin{itemize}\\n  \\\\item ...\\n\\\\end{itemize}"
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
            You are a LaTeX expert. Create a resume based on these data nodes and template.
            Nodes: ${JSON.stringify(blocks)}
            Template: ${template || 'Standard article'}
            
            IMPORTANT RULES:
            1. Use ONLY these standard packages: article class, inputenc, fontenc, fullpage, titlesec, enumitem, hyperref, marvosym, tabularx, multicol, xcolor.
            2. Do NOT use moderncv, fontawesome, or fontawesome5.
            3. Use \\Telefon for phone, \\Letter for email, \\Mundus for website icons (from marvosym).
            4. CRITICAL: Never create an empty \\begin{itemize}...\\end{itemize} block. If there are no items, omit the environment entirely. Every itemize MUST have at least one \\item.
            5. Ensure all special characters (&, %, $, etc.) are escaped.
            6. Return ONLY the plain LaTeX code.
        `;
        const result = await model.generateContent(prompt);
        return result.response.text();
    }
};

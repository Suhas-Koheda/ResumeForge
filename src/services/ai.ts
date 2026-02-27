/**
 * Simple service to interact with Gemini API.
 * In a real-world app, this should be handled by a secure backend.
 */
export const geminiService = {
    async polishExperience(rawText: string, apiKey: string) {
        if (!apiKey) throw new Error("API Key is required");

        const prompt = `
      You are an expert resume writer and LaTeX specialist. 
      Convert the following raw job experience description into professional, high-impact bullet points.

      STRICT RULES:
      1. DO NOT assume or invent any metrics, names, tools, or facts not mentioned in the input.
      2. If you want to use a quantitative structure but the number is missing, use placeholders like "[X]%" or "[Number]".
      3. Stay 100% faithful to the raw input while improving professional tone and structure.
      
      Raw Description:
      "${rawText}"
      
      Return the response in strictly valid JSON format:
      {
        "polishedPoints": ["Point 1", "Point 2", ...],
        "latexCode": "\\\\begin{itemize}\\n  \\\\item ...\\n\\\\end{itemize}"
      }
    `;

        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            response_mime_type: "application/json",
                        },
                    }),
                }
            );

            const data = await response.json();
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!content) throw new Error("Failed to get response from Gemini");

            return JSON.parse(content);
        } catch (error) {
            console.error("Gemini Error:", error);
            throw error;
        }
    },

    async polishProject(rawText: string, apiKey: string) {
        if (!apiKey) throw new Error("API Key is required");

        const prompt = `
      You are an elite Senior Software Engineer and Technical Resume Consultant. 
      Analyze the following project description or codebase summary and transform it into a world-class resume entry.

      STRATEGY & CONSTRAINTS:
      1. Use the Google XYZ Formula: "Accomplished [X] as measured by [Y], by doing [Z]".
      2. NO ASSUMPTIONS: Do not invent metrics, percentages, or tech stacks not present in the input. 
      3. Use bracketed placeholders like "[X]%" or "[Metric]" if quantification is missing but appropriate for the structure.
      4. Start every bullet point with a strong action verb (e.g., Architected, Orchestrated).

      Input:
      "${rawText}"
      
      Return the response in strictly valid JSON format:
      {
        "polishedPoints": [
          "Developed... resulting in...",
          "Architected... improving...",
          "Optimized... reducing..."
        ],
        "technologies": "List only technologies explicitly mentioned or strongly implied by code snippets.",
        "latexCode": "\\\\textbf{Project Name} \\\\hfill \\\\textit{Techs}\\\\begin{itemize}[noitemsep,topsep=0pt]\\n  \\\\item Architected... resulting in...\\n\\\\end{itemize}"
      }
    `;

        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            response_mime_type: "application/json",
                        },
                    }),
                }
            );

            const data = await response.json();
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!content) throw new Error("Failed to get response from Gemini");

            return JSON.parse(content);
        } catch (error) {
            console.error("Gemini Error:", error);
            throw error;
        }
    },

    async polishEducation(rawText: string, apiKey: string) {
        if (!apiKey) throw new Error("API Key is required");
        const prompt = `
      Convert the following education details into a professional resume entry and LaTeX code.
      Input: "${rawText}"
      Return JSON: { "school": "...", "degree": "...", "year": "...", "latexCode": "\\\\textbf{School} \\\\hfill \\\\textit{Year}\\\\newline Degree" }
    `;
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { response_mime_type: "application/json" } }),
            });
            const data = await response.json();
            return JSON.parse(data.candidates[0].content.parts[0].text);
        } catch (error) { throw error; }
    },

    async polishSkills(rawText: string, apiKey: string) {
        if (!apiKey) throw new Error("API Key is required");
        const prompt = `
      Categorize and polish the following technical skills into a professional resume format and LaTeX code.
      Input: "${rawText}"
      Return JSON: { "skills": "Languages: ...; Frameworks: ...", "latexCode": "\\\\textbf{Skills: } Languages, Frameworks..." }
    `;
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { response_mime_type: "application/json" } }),
            });
            const data = await response.json();
            return JSON.parse(data.candidates[0].content.parts[0].text);
        } catch (error) { throw error; }
    },

    async assembleFullResume(blocks: any[], template: string, apiKey: string) {
        if (!apiKey) throw new Error("API Key is required");

        // Default professional preamble if no template provided
        const defaultTemplate = `
\\documentclass[11pt,a4paper,sans]{moderncv}
\\moderncvstyle{classic}
\\moderncvcolor{blue}
\\usepackage[utf8]{inputenc}
\\usepackage[scale=0.75]{geometry}
\\name{Full}{Name}
\\begin{document}
\\makecvtitle
[CONTENT_HERE]
\\end{document}
    `;

        const activeTemplate = template || defaultTemplate;

        const prompt = `
      You are a LaTeX expert. I have a set of resume data nodes and a LaTeX template.
      Your task is to populate the template with the data from the nodes.
      
      Nodes Data (JSON): ${JSON.stringify(blocks)}
      Template: ${activeTemplate}
      
      RULES:
      1. Map the data from the nodes into the appropriate sections of the template.
      2. If the template has placeholders like [CONTENT_HERE], replace it with the structured content.
      3. Ensure the final LaTeX code is valid and compilable in Overleaf.
      4. DO NOT change the template's styling or packages, just the content.
      5. NO ASSUMPTIONS: Use [X] for missing data.
      
      Return ONLY the plain LaTeX code as a string, no JSON wrapper.
    `;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
            });
            const data = await response.json();
            return data.candidates[0].content.parts[0].text;
        } catch (error) { throw error; }
    }
};

const latex = `
\\begin{center}
    {\\Huge \\scshape \\color{ACCENT_COLOR} Suhas Koheda} \\\\ \\vspace{2pt}
    Hyderabad, India ~~
    \\faPhone\\ +91-7396824087 ~~
    \\href{mailto:sharmasuhas450@gmail.com}{\\faEnvelope\\ \\underline{sharmasuhas450@gmail.com}} \\\\
    \\href{https://suhask.dev}{\\faGlobe\\ \\underline{suhask.dev}} ~~
    \\href{https://linkedin.com/in/ssk450}{\\faLinkedin\\ \\underline{linkedin.com/in/ssk450}} ~~
    \\href{https://github.com/suhas-koheda}{\\faGithub\\ \\underline{github.com/suhas-koheda}}
\\end{center}

\\section{EDUCATION}
\\customSubHeadingContentStart
\\customSubHeading
{Vellore Institute of Technology, Chennai}{2023 -- 2027}
{B.Tech in Computer Science and Engineering (AI/ML), CGPA: 9.0 / 10.0}{Chennai, India}
\\customSubHeading
{Nine Education Academy}{2021 -- 2023}
{Telangana State Board (Class XII), 93.5\\%}{Hyderabad, India}
\\customSubHeadingContentEnd

\\section{EXPERIENCE}
\\customSubHeadingContentStart
\\customSubHeading
{Daira Edtech}{Jul 2025 -- Present}
{AI/ML Development Intern}{Remote}
\\customItemListStart
\\customItem{Engineered AI-powered educational tools using LangChain}
\\customItemListEnd
\\customSubHeadingContentEnd

\\section{PROJECTS}
\\customSubHeadingContentStart

\\customProject
{\\textbf{Indian Legal Analytics Dashboard}
$\\vert$ \\emph{Python, Streamlit, LangChain, Gemini AI}}
{\\href{https://huggingface.co/spaces/UnknwonHaas/indian-legal-analysis}{Live} $\\vert$
\\href{https://github.com/Suhas-Koheda/Indian-Legal-Analytics}{Code} \\quad Jan 2026}
\\customItemListStart
\\customItem{Built a full-stack legal analytics platform}
\\customItemListEnd
`;

const blocks = [];

const nameMatch = latex.match(/\\color\{ACCENT_COLOR\}\s*([^}]+)\}/) || latex.match(/\\Huge\s+\\scshape\s+(?:\\color\{[^}]+\}\s*)?([^\\]+?)\s*(?:\\\\|\\vspace)/) || latex.match(/\\begin\{center\}[^]*?\\Huge\s*\\scshape\s*\\color\{[^\}]+\}\s*([^\}\\]+)/);
const emailMatch = latex.match(/mailto:([^}]+)/);
const phoneMatch = latex.match(/faPhone\\\s*([\+\d\-]+)/) || latex.match(/\\Telefon\\\s*([\+\d\-]+)/);

// For location, we can find the first non-command string before \faPhone
const locationMatch = latex.match(/\\vspace\{[^}]+\}\s*([^~\\]+)/);

const websiteMatch = latex.match(/\\href\{([^}]+)\}\s*\{\\faGlobe/);
const linkedinMatch = latex.match(/\\href\{([^}]+)\}\s*\{\\faLinkedin/);
const githubMatch = latex.match(/\\href\{([^}]+)\}\s*\{\\faGithub/);

blocks.push({
    type: 'header',
    data: {
        name: nameMatch ? nameMatch[1].trim() : '',
        email: emailMatch ? emailMatch[1].trim() : '',
        phone: phoneMatch ? phoneMatch[1].trim() : '',
        location: locationMatch ? locationMatch[1].trim() : '',
        website: websiteMatch ? websiteMatch[1].trim() : '',
        linkedin: linkedinMatch ? linkedinMatch[1].trim() : '',
        github: githubMatch ? githubMatch[1].trim() : ''
    }
});

const eduSectionMatch = latex.match(/\\section\{EDUCATION\}([^]*?)(?=\\section|\\end\{document\}|$)/i);
if (eduSectionMatch) {
    const eduRaw = eduSectionMatch[1].split(/\\customSubHeading\b/).filter(s => s.trim().length > 0 && !s.includes('ContentStart'));
    eduRaw.forEach(eRaw => {
        const matches = [...eRaw.matchAll(/\{([^{}]+)\}/g)].map(m => m[1]);
        if (matches.length >= 4) {
            blocks.push({
                type: 'education',
                data: { school: matches[0], year: matches[1], degree: matches[2], location: matches[3] }
            });
        }
    });
}

const expSectionMatch = latex.match(/\\section\{EXPERIENCE\}([^]*?)(?=\\section|\\end\{document\}|$)/i);
if (expSectionMatch) {
    const expRaw = expSectionMatch[1].split(/\\customSubHeading\b/).filter(s => s.trim().length > 0 && !s.includes('ContentStart'));
    expRaw.forEach(eRaw => {
        const headMatches = [...eRaw.matchAll(/\{([^{}]+)\}/g)].map(m => m[1]);
        const highlights = (eRaw.match(/\\customItem\{([^\}]+)\}/g) || []).map(mi => mi.replace(/\\customItem\{|\}/g, '').trim());
        if (headMatches.length >= 4) {
            blocks.push({
                type: 'experience',
                data: { company: headMatches[0], duration: headMatches[1], role: headMatches[2], location: headMatches[3], highlights }
            });
        }
    });
}

const projSectionMatch = latex.match(/\\section\{PROJECTS?\}([^]*?)(?=\\section|\\end\{document\}|$)/i);
if (projSectionMatch) {
    const projectsRaw = projSectionMatch[1].split(/\\customProject\b/).filter(s => s.trim().length > 0 && !s.includes('ContentStart'));
    projectsRaw.forEach(pRaw => {
        const titleMatch = pRaw.match(/\\textbf\{([^\}]+)\}/);
        const techMatch = pRaw.match(/\\emph\{([^\}]+)\}/);
        const highlights = (pRaw.match(/\\customItem\{([^\}]+)\}/g) || []).map(mi => mi.replace(/\\customItem\{|\}/g, '').trim());
        
        const liveLinkMatch = pRaw.match(/\\href\{([^}]+)\}\s*\{[^}]*?(?:Live|Link)[^}]*\}/i);
        const codeLinkMatch = pRaw.match(/\\href\{([^}]+)\}\s*\{[^}]*?Code[^}]*\}/i);
        let duration = "";
        const quadMatch = pRaw.match(/\\quad\s*([^\}\n]+)/);
        if (quadMatch) duration = quadMatch[1].replace('}', '').trim();

        if (titleMatch || techMatch || highlights.length > 0) {
            blocks.push({
                type: 'project',
                data: {
                    title: titleMatch ? titleMatch[1] : '',
                    technologies: techMatch ? techMatch[1] : '',
                    liveLink: liveLinkMatch ? liveLinkMatch[1] : '',
                    githubLink: codeLinkMatch ? codeLinkMatch[1] : '',
                    duration,
                    highlights
                }
            });
        }
    });
}

const skillsSectionMatch = latex.match(/\\section\{TECHNICAL SKILLS\}([^]*?)(?=\\section|\\end\{document\}|$)/i);
if (skillsSectionMatch) {
    const skillItemRegex = /\\item\s*\\textbf\{([^\}]+)\}:?\s*([^\n\\]+)/g;
    let m;
    while ((m = skillItemRegex.exec(skillsSectionMatch[1])) !== null) {
        blocks.push({
            type: 'skills',
            data: { category: m[1].replace(':', '').trim(), skills: m[2].trim() }
        });
    }
}

console.log(JSON.stringify(blocks, null, 2));

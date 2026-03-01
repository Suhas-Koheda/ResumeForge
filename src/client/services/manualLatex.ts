import { ResumeBlock } from '@shared/types';

export const manualLatexGenerator = {
    generatePreamble(header: any): string {
        return `
%-------------------------
% CV in LaTeX
% Author: Udoy Saha (Template)
% Filled by: ${this.escapeLatex(header.name || 'Your Name')}
%------------------------

\\documentclass[letterpaper,11pt]{article}
\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\usepackage{fontawesome5}
\\usepackage{multicol}
\\input{glyphtounicode}
\\usepackage{xcolor}

\\definecolor{ACCENT_COLOR}{RGB}{0,51,102}

\\pagestyle{fancy}
\\fancyhf{}
\\renewcommand{\\headrulewidth}{0pt}

\\addtolength{\\oddsidemargin}{-0.6in}
\\addtolength{\\textwidth}{1.19in}
\\addtolength{\\topmargin}{-0.7in}
\\addtolength{\\textheight}{1.4in}

\\titleformat{\\section}{
\\vspace{-4pt}\\scshape\\raggedright\\large\\bfseries\\color{ACCENT_COLOR}
}{}{0em}{}[\\color{ACCENT_COLOR}\\titlerule \\vspace{-5pt}]

\\pdfgentounicode=1

\\newcommand{\\customItem}[1]{\\item\\small{#1}}
\\newcommand{\\customSubHeading}[4]{
  \\item
  \\begin{tabular*}{1.0\\textwidth}{l@{\\extracolsep{\\fill}}r}
    \\textbf{#1} & \\textbf{\\small #2} \\\\
    \\textit{\\small#3} & \\textit{\\small #4}
  \\end{tabular*}
}
\\newcommand{\\customProject}[2]{
  \\item
  \\begin{tabular*}{1.001\\textwidth}{l@{\\extracolsep{\\fill}}r}
    \\small#1 & \\textbf{\\small #2}
  \\end{tabular*}
}

\\newcommand{\\customSubHeadingContentStart}{\\begin{itemize}[leftmargin=0in,label={}]}
\\newcommand{\\customSubHeadingContentEnd}{\\end{itemize}}
\\newcommand{\\customItemListStart}{\\begin{itemize}}
\\newcommand{\\customItemListEnd}{\\end{itemize}}

\\begin{document}

%----------HEADER----------
\\begin{center}
    {\\Huge \\scshape \\color{ACCENT_COLOR} ${this.escapeLatex(header.name || 'Your Name')}} \\\\ \\vspace{2pt}
    ${this.escapeLatex(header.location || 'Location')} ~~
    \\faPhone\\ ${this.escapeLatex(header.phone || 'Phone')} ~~
    \\href{mailto:${header.email || ''}}{\\faEnvelope\\ \\underline{${this.escapeLatex(header.email || '')}}} \\\\
    ${[
        header.website ? `\\href{https://${this.escapeLatex(header.website.replace('https://', '').replace('http://', ''))}}{\\faGlobe\\ \\underline{${this.escapeLatex(header.website)}}}` : null,
        header.linkedin ? `\\href{https://${this.escapeLatex(header.linkedin.replace('https://', '').replace('http://', ''))}}{\\faLinkedin\\ \\underline{${this.escapeLatex(header.linkedin)}}}` : null,
        header.github ? `\\href{https://${this.escapeLatex(header.github.replace('https://', '').replace('http://', ''))}}{\\faGithub\\ \\underline{${this.escapeLatex(header.github)}}}` : null
    ].filter(Boolean).join(" ~~\n    ")}
\\end{center}
`;
    },

    generatePostamble(): string {
        return `\\end{document}`;
    },

    generate(blocks: ResumeBlock[]): string {
        const enabledBlocks = blocks.filter(b => b.enabled !== false);
        const header = (enabledBlocks.find(b => b.type === 'header') || blocks.find(b => b.type === 'header'))?.data || {};
        const experiences = enabledBlocks.filter(b => b.type === 'experience').map(b => b.data);
        const education = enabledBlocks.filter(b => b.type === 'education').map(b => b.data);
        const projects = enabledBlocks.filter(b => b.type === 'project').map(b => b.data);
        const skills = enabledBlocks.filter(b => b.type === 'skills').map(b => b.data);
        const summaries = enabledBlocks.filter(b => b.type === 'summary').map(b => b.data);
        const others = enabledBlocks.filter(b => b.type === 'other').map(b => b.data);

        const preamble = this.generatePreamble(header);

        let content = '';

        // Summary Section
        if (summaries.length > 0) {
            content += `
%-----------SUMMARY-----------
\\section{PROFESSIONAL SUMMARY}
${summaries.map(s => `
${this.escapeLatex(s.summary || '')}
${(s.highlights && s.highlights.length > 0) ? `\\customItemListStart
${s.highlights.map((h: string) => `\\customItem{${this.escapeLatex(h)}}`).join('\n')}
\\customItemListEnd` : ''}
`).join('\n\n')}
`;
        }

        // Education Section
        if (education.length > 0) {
            content += `
%-----------EDUCATION-----------
\\section{EDUCATION}
\\customSubHeadingContentStart
${education.map(edu => `
\\customSubHeading
{${this.escapeLatex(edu.school || 'University')}}{${this.escapeLatex(edu.year || 'Year')}}
{${this.escapeLatex(edu.degree || 'Degree')}}{${this.escapeLatex(edu.location || 'Location')}}
`).join('')}
\\customSubHeadingContentEnd
`;
        }

        // Experience Section
        if (experiences.length > 0) {
            content += `
%-----------EXPERIENCE-----------
\\section{EXPERIENCE}
\\customSubHeadingContentStart
${experiences.map(exp => `
\\customSubHeading
{${this.escapeLatex(exp.company || 'Company')}}{${this.escapeLatex(exp.duration || 'Duration')}}
{${this.escapeLatex(exp.role || 'Role')}}{${this.escapeLatex(exp.location || 'Location')}}
${(exp.highlights && exp.highlights.length > 0) ? `\\customItemListStart
${exp.highlights.map((h: string) => `\\customItem{${this.escapeLatex(h)}}`).join('\n')}
\\customItemListEnd` : ''}
`).join('')}
\\customSubHeadingContentEnd
`;
        }

        // Skills Section
        if (skills.length > 0) {
            content += `
%-----------TECHNICAL SKILLS-----------
\\section{TECHNICAL SKILLS}
\\begin{itemize}[noitemsep, left=0pt]
${skills.map(s => {
                const points = (s.skills || '').split(';').map((p: string) => p.trim()).filter((p: string) => p);
                return points.map((p: string) => {
                    const [category, items] = p.split(':');
                    if (items) {
                        return `\\item \\textbf{${this.escapeLatex(category.trim())}:} ${this.escapeLatex(items.trim())}`;
                    }
                    return `\\item ${this.escapeLatex(p)}`;
                }).join('\n');
            }).join('\n')}
\\end{itemize}
`;
        }

        // Projects Section
        if (projects.length > 0) {
            content += `
%-----------PROJECTS-----------
\\section{PROJECTS}
\\customSubHeadingContentStart
${projects.map(proj => {
                const techArray = Array.isArray(proj.technologies) ? proj.technologies.join(', ') : proj.technologies;
                const tech = techArray ? `$\\vert$ \\emph{${this.escapeLatex(techArray)}}` : '';
                const links = [
                    proj.liveLink ? `\\href{${this.escapeLatex(proj.liveLink)}}{Live}` : '',
                    proj.githubLink ? `\\href{${this.escapeLatex(proj.githubLink)}}{Code}` : ''
                ].filter(l => l).join(' $\\vert$ ');

                return `
\\customProject
{\\textbf{${this.escapeLatex(proj.title) || 'Project'}} ${tech}}
{${links} \\quad ${this.escapeLatex(proj.duration || proj.date || '')}}
${(proj.highlights && proj.highlights.length > 0) ? `\\customItemListStart
${proj.highlights.map((h: string) => `\\customItem{${this.escapeLatex(h)}}`).join('\n')}
\\customItemListEnd` : ''}
`;
            }).join('')}
\\customSubHeadingContentEnd
`;
        }

        // Other Sections
        if (others.length > 0) {
            content += others.map(o => `
%-----------OTHER: ${o.title || 'ADDITIONAL'}-----------
\\section{${this.escapeLatex(o.title || 'ADDITIONAL').toUpperCase()}}
${(o.highlights && o.highlights.length > 0) ? `\\customSubHeadingContentStart
\\item
\\customItemListStart
${o.highlights.map((h: string) => `\\customItem{${this.escapeLatex(h)}}`).join('\n')}
\\customItemListEnd
\\customSubHeadingContentEnd` : this.escapeLatex(o.content || '')}
`).join('');
        }

        const end = this.generatePostamble();

        return preamble + content + end;
    },

    escapeLatex(text: string): string {
        if (!text) return '';
        return text
            .replace(/\\/g, '\\textbackslash ')
            .replace(/&/g, '\\&')
            .replace(/%/g, '\\%')
            .replace(/\$/g, '\\$')
            .replace(/#/g, '\\#')
            .replace(/_/g, '\\_')
            .replace(/\{/g, '\\{')
            .replace(/\}/g, '\\}')
            .replace(/\^/g, '\\^{}')
            .replace(/~/g, '\\~{}');
    }
};

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
        header.website ? `\\href{https://${header.website.replace('https://', '').replace('http://', '')}}{\\faGlobe\\ \\underline{${this.escapeLatex(header.website)}}}` : null,
        header.linkedin ? `\\href{https://${header.linkedin.replace('https://', '').replace('http://', '')}}{\\faLinkedin\\ \\underline{${this.escapeLatex(header.linkedin)}}}` : null,
        header.github ? `\\href{https://${header.github.replace('https://', '').replace('http://', '')}}{\\faGithub\\ \\underline{${this.escapeLatex(header.github)}}}` : null
    ].filter(Boolean).join(" ~~\n    ")}
\\end{center}
`;
    },

    generatePostamble(): string {
        return `\\end{document}`;
    },

    generate(blocks: ResumeBlock[]): string {
        const header = blocks.find(b => b.type === 'header')?.data || {};
        const experiences = blocks.filter(b => b.type === 'experience').map(b => b.data);
        const education = blocks.filter(b => b.type === 'education').map(b => b.data);
        const projects = blocks.filter(b => b.type === 'project').map(b => b.data);
        const skills = blocks.filter(b => b.type === 'skills').map(b => b.data);

        const preamble = this.generatePreamble(header);

        let content = '';

        // Education Section
        if (education.length > 0) {
            content += `
%-----------EDUCATION-----------
\\section{EDUCATION}
\\customSubHeadingContentStart
${education.map(edu => `
\\customSubHeading
{${edu.school || 'University'}}{${edu.year || 'Year'}}
{${edu.degree || 'Degree'}}{${edu.location || 'Location'}}
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
{${exp.company || 'Company'}}{${exp.duration || 'Duration'}}
{${exp.role || 'Role'}}{${exp.location || 'Location'}}
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
                        return `\\item \\textbf{${category.trim()}:} ${this.escapeLatex(items.trim())}`;
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
                    proj.liveLink ? `\\href{${proj.liveLink}}{Live}` : '',
                    proj.githubLink ? `\\href{${proj.githubLink}}{Code}` : ''
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

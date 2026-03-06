import { ResumeBlock } from '@shared/types';

export const manualLatexGenerator = {
    generatePreamble(header: any): string {
        return `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[margin=1in]{geometry}
\\usepackage{hyperref}
\\usepackage{enumitem}

\\begin{document}

\\begin{center}
    {\\huge \\textbf{${this.escapeLatex(header.name || 'Your Name')}}} \\\\ \\vspace{2pt}
    ${this.escapeLatex(header.location || '')} ${header.phone ? `| ${this.escapeLatex(header.phone)}` : ''} ${header.email ? `| \\href{mailto:${header.email}}{${this.escapeLatex(header.email)}}` : ''}
\\end{center}
`;
    },

    generatePostamble(): string {
        return `\\end{document}`;
    },

    generate(blocks: ResumeBlock[]): string {
        const enabledBlocks = blocks.filter(b => b.enabled !== false);
        const header = (enabledBlocks.find(b => b.type.toLowerCase() === 'header') || blocks.find(b => b.type.toLowerCase() === 'header'))?.data || {};
        const experiences = enabledBlocks.filter(b => b.type.toLowerCase().trim() === 'experience').map(b => b.data);
        const education = enabledBlocks.filter(b => b.type.toLowerCase().trim() === 'education').map(b => b.data);
        const projects = enabledBlocks.filter(b => b.type.toLowerCase().trim() === 'project').map(b => b.data);
        const skills = enabledBlocks.filter(b => b.type.toLowerCase().trim() === 'skills').map(b => b.data);
        const summaries = enabledBlocks.filter(b => b.type.toLowerCase().trim() === 'summary').map(b => b.data);
        const others = enabledBlocks.filter(b => b.type.toLowerCase().trim() === 'other').map(b => b.data);

        const preamble = this.generatePreamble(header);

        let content = '';

        // Summary Section
        if (summaries.length > 0) {
            content += `
\\section*{Summary}
${summaries.map(s => `
${this.escapeLatex(s.summary || '')}
${(s.highlights && s.highlights.length > 0) ? `\\begin{itemize}
${s.highlights.map((h: string) => `  \\item ${this.escapeLatex(h)}`).join('\n')}
\\end{itemize}` : ''}
`).join('\n\n')}
`;
        }

        // Education Section
        if (education.length > 0) {
            content += `
\\section*{Education}
${education.map(edu => `
\\noindent \\textbf{${this.escapeLatex(edu.school || 'University')}} \\hfill ${this.escapeLatex(edu.year || 'Year')} \\\\
\\textit{${this.escapeLatex(edu.degree || 'Degree')}} \\hfill ${this.escapeLatex(edu.location || 'Location')}

`).join('\n')}
`;
        }

        // Experience Section
        if (experiences.length > 0) {
            content += `
\\section*{Experience}
${experiences.map(exp => `
\\noindent \\textbf{${this.escapeLatex(exp.company || 'Company')}} \\hfill ${this.escapeLatex(exp.duration || 'Duration')} \\\\
\\textit{${this.escapeLatex(exp.role || 'Role')}} \\hfill ${this.escapeLatex(exp.location || 'Location')}
${(exp.highlights && exp.highlights.length > 0) ? `\\begin{itemize}
${exp.highlights.map((h: string) => `  \\item ${this.escapeLatex(h)}`).join('\n')}
\\end{itemize}` : ''}
`).join('\n')}
`;
        }

        // Skills Section
        if (skills.length > 0) {
            content += `
\\section*{Skills}
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
\\section*{Projects}
${projects.map(proj => {
                const techArray = Array.isArray(proj.technologies) ? proj.technologies.join(', ') : proj.technologies;
                const tech = techArray ? `(\\textit{${this.escapeLatex(techArray)}})` : '';
                return `
\\noindent \\textbf{${this.escapeLatex(proj.title) || 'Project'}} ${tech} \\hfill ${this.escapeLatex(proj.duration || proj.date || '')}
${(proj.highlights && proj.highlights.length > 0) ? `\\begin{itemize}
${proj.highlights.map((h: string) => `  \\item ${this.escapeLatex(h)}`).join('\n')}
\\end{itemize}` : ''}
`;
            }).join('\n')}
`;
        }

        // Other Sections
        if (others.length > 0) {
            content += others.map(o => `
\\section*{${this.escapeLatex(o.title || 'Additional')}}
${(o.highlights && o.highlights.length > 0) ? `\\begin{itemize}
${o.highlights.map((h: string) => `  \\item ${this.escapeLatex(h)}`).join('\n')}
\\end{itemize}` : this.escapeLatex(o.content || '')}
`).join('\n');
        }

        const end = this.generatePostamble();

        return preamble + '\n' + content + '\n' + end;
    },

    escapeLatex(text: string): string {
        if (!text) return '';
        let escaped = text
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

        // Cleanup artifacts
        if (escaped.length <= 1 && /^[\]ćçab]$/i.test(escaped)) return '';
        return escaped;
    }
};

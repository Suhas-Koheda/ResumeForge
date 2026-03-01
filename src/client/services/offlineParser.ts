import { ResumeBlock, BlockType } from '@shared/types';

export const offlineLatexParser = {
    parseLatexBlocks(latex: string): Partial<ResumeBlock>[] {
        const blocks: Partial<ResumeBlock>[] = [];

        // Header
        const nameMatch = latex.match(/\\Huge\s+\\scshape\s+(?:\\color\{[^}]+\}\s*)?([^}\\]+)/);
        const emailMatch = latex.match(/mailto:([^}]+)/);
        const phoneMatch = latex.match(/\\faPhone\\\s*([\+\d\-]+)/) || latex.match(/\\Telefon\\\s*([\+\d\-]+)/);
        const locationMatch = latex.match(/\\vspace\{[^}]+\}\s*([^~\\]+)/) || latex.match(/Hyderabad, India/) || latex.match(/\\begin\{center\}[^]*?([^\n,]+,\s*[^\n\\]+)[^]*?\\faPhone/);

        const websiteMatch = latex.match(/\\href\{([^}]+)\}\s*\{\\faGlobe/) || latex.match(/\\href\{([^}]+)\}\s*\{\\Mundus/);
        const linkedinMatch = latex.match(/\\href\{([^}]+)\}\s*\{\\faLinkedin/) || latex.match(/\\href\{([^}]+)\}\s*\{\\textbf\{L\}/);
        const githubMatch = latex.match(/\\href\{([^}]+)\}\s*\{\\faGithub/) || latex.match(/\\href\{([^}]+)\}\s*\{\\textbf\{G\}/);

        if (nameMatch || emailMatch || phoneMatch) {
            blocks.push({
                type: 'header',
                data: {
                    name: nameMatch ? this.unescapeLatex(nameMatch[1].trim()) : '',
                    email: emailMatch ? emailMatch[1].trim() : '', // Email in URL usually doesn't need unescape
                    phone: phoneMatch ? this.unescapeLatex(phoneMatch[1].trim()) : '',
                    location: locationMatch ? this.unescapeLatex((typeof locationMatch === 'string' ? locationMatch : locationMatch[1] || locationMatch[0]).trim()) : '',
                    website: websiteMatch ? websiteMatch[1].trim() : '',
                    linkedin: linkedinMatch ? linkedinMatch[1].trim() : '',
                    github: githubMatch ? githubMatch[1].trim() : ''
                }
            });
        }

        // Education
        const eduSectionMatch = latex.match(/\\section\{EDUCATION\}([^]*?)(?=\\section|\\end\{document\}|$)/i);
        if (eduSectionMatch) {
            const eduItemRegex = /\\customSubHeading\s*\{([^\}]+)\}\s*\{([^\}]+)\}\s*\{([^\}]+)\}\s*\{([^\}]+)\}/g;
            let m;
            while ((m = eduItemRegex.exec(eduSectionMatch[1])) !== null) {
                blocks.push({
                    type: 'education',
                    data: {
                        school: this.unescapeLatex(m[1]),
                        year: this.unescapeLatex(m[2]),
                        degree: this.unescapeLatex(m[3]),
                        location: this.unescapeLatex(m[4])
                    }
                });
            }
        }

        // Experience
        const expSectionMatch = latex.match(/\\section\{EXPERIENCE\}([^]*?)(?=\\section|\\end\{document\}|$)/i);
        if (expSectionMatch) {
            const expItemRegex = /\\customSubHeading\s*\{([^\}]+)\}\s*\{([^\}]+)\}\s*\{([^\}]+)\}\s*\{([^\}]+)\}([^]*?)(?=\\customSubHeading|\\customSubHeadingContentEnd|$)/g;
            let m;
            while ((m = expItemRegex.exec(expSectionMatch[1])) !== null) {
                const highlights = (m[5].match(/\\customItem\{([^\}]+)\}/g) || []).map(mi => this.unescapeLatex(mi.replace(/\\customItem\{|\}/g, '').trim()));
                blocks.push({
                    type: 'experience',
                    data: {
                        company: this.unescapeLatex(m[1]),
                        duration: this.unescapeLatex(m[2]),
                        role: this.unescapeLatex(m[3]),
                        location: this.unescapeLatex(m[4]),
                        highlights
                    }
                });
            }
        }

        // Skills
        const skillsSectionMatch = latex.match(/\\section\{TECHNICAL SKILLS\}([^]*?)(?=\\section|\\end\{document\}|$)/i);
        if (skillsSectionMatch) {
            const skillItemRegex = /\\item\s*\\textbf\{([^\}]+)\}:?\s*([^\n\\]+)/g;
            let m;
            while ((m = skillItemRegex.exec(skillsSectionMatch[1])) !== null) {
                blocks.push({
                    type: 'skills',
                    data: {
                        category: this.unescapeLatex(m[1].replace(':', '').trim()),
                        skills: this.unescapeLatex(m[2].trim())
                    }
                });
            }
        }

        // Projects
        const projSectionMatch = latex.match(/\\section\{PROJECTS?\}([^]*?)(?=\\section|\\end\{document\}|$)/i);
        if (projSectionMatch) {
            const projectsRaw = projSectionMatch[1].split(/\\customProject\b/).filter(s => s.trim().length > 0 && !s.includes('ContentStart'));
            projectsRaw.forEach(pRaw => {
                const titleMatch = pRaw.match(/\\textbf\{([^\}]+)\}/);
                const techMatch = pRaw.match(/\\emph\{([^\}]+)\}/);
                const highlights = (pRaw.match(/\\customItem\{([^\}]+)\}/g) || []).map(mi => this.unescapeLatex(mi.replace(/\\customItem\{|\}/g, '').trim()));

                const liveLinkMatch = pRaw.match(/\\href\{([^}]+)\}\s*\{[^}]*?(?:Live|Link)[^}]*\}/i);
                const codeLinkMatch = pRaw.match(/\\href\{([^}]+)\}\s*\{[^}]*?Code[^}]*\}/i);

                let duration = "";
                const quadMatch = pRaw.match(/\\quad\s*([^\}\n]+)/);
                if (quadMatch) duration = quadMatch[1].replace('}', '').trim();

                if (titleMatch || techMatch || highlights.length > 0) {
                    blocks.push({
                        type: 'project',
                        data: {
                            title: titleMatch ? this.unescapeLatex(titleMatch[1]) : '',
                            technologies: techMatch ? this.unescapeLatex(techMatch[1]) : '',
                            liveLink: liveLinkMatch ? liveLinkMatch[1] : '', // URLs usually shouldn't be unescaped for plain text
                            githubLink: codeLinkMatch ? codeLinkMatch[1] : '',
                            duration: duration ? this.unescapeLatex(duration) : '',
                            highlights
                        }
                    });
                }
            });
        }

        return blocks;
    },

    unescapeLatex(text: string): string {
        if (!text) return '';
        return text
            .replace(/\\&/g, '&')
            .replace(/\\%/g, '%')
            .replace(/\\\$/g, '$')
            .replace(/\\#/g, '#')
            .replace(/\\_/g, '_')
            .replace(/\\\{/g, '{')
            .replace(/\\\}/g, '}')
            .replace(/\\\^{}/g, '^')
            .replace(/\\~{}/g, '~')
            .replace(/\\textbackslash\s?/g, '\\');
    }
};

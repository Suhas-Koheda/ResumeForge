import { latexParser } from 'latex-utensils';
import { NormalizedSectionEntry, TemplateAdapter } from '../types.js';

export class UdoySahaAdapter implements TemplateAdapter {
    name = "Udoy Saha / Deedy Derivative";

    detect(ast: latexParser.LatexAst): boolean {
        // Look for custom commands like \customSubHeading, \customItem, \customProject
        for (const node of ast.content) {
            if (node.kind === 'command' && node.name === 'newcommand') {
                const firstArg = node.args[0];
                if (firstArg && firstArg.kind === 'arg.group' && firstArg.content[0] && firstArg.content[0].kind === 'command') {
                    if (firstArg.content[0].name === 'customSubHeading' || firstArg.content[0].name === 'customProject') {
                        return true;
                    }
                }
            }
        }

        // Alternative detection method via raw string backup
        const asString = JSON.stringify(ast);
        return asString.includes('customSubHeading') || asString.includes('customProject');
    }

    extractHeader(ast: latexParser.LatexAst): Record<string, any> {
        const header: any = { name: '', email: '', phone: '', location: '', website: '', linkedin: '', github: '' };

        // Scan for \Huge Suhas Koheda
        for (const node of ast.content) {
            if (node.kind === 'env' && node.name === 'center') {
                for (const sub of node.content) {
                    if (sub.kind === 'command' && sub.name === 'Huge') {
                        // Name is usually after Huge
                        header.name = this.flattenAst(node.content).split('\n')[0].trim();
                    }
                    if (sub.kind === 'command' && sub.name === 'href') {
                        const url = this.extractTextArg(sub, 0);
                        if (url.includes('mailto:')) header.email = url.replace('mailto:', '');
                        else if (url.includes('linkedin.com')) header.linkedin = url;
                        else if (url.includes('github.com')) header.github = url;
                        else header.website = url;
                    }
                }
            }
        }

        // Search deeper for phone and location strings if still empty
        const fullText = this.flattenAst(ast.content);
        const phoneMatch = fullText.match(/\+?\d[\d\-\s]{8,}\d/);
        if (phoneMatch) header.phone = phoneMatch[0];

        const locMatch = fullText.match(/Hyderabad,\s*India|Chennai,\s*India|[A-Z][a-z]+,\s*[A-Z][a-z]+/);
        if (locMatch) header.location = locMatch[0];

        return header;
    }

    extractExperience(astContent: latexParser.Node[]): NormalizedSectionEntry[] {
        const entries: NormalizedSectionEntry[] = [];
        let currentEntry: NormalizedSectionEntry | null = null;

        for (const node of astContent) {
            // \customSubHeading{Company}{Duration}{Role}{Location}
            if (node.kind === 'command' && (node.name === 'customSubHeading' || node.name === 'customProject')) {
                if (currentEntry) entries.push(currentEntry);
                currentEntry = {
                    primary: this.extractTextArg(node, 0),
                    date: this.extractTextArg(node, 1),
                    secondary: node.name === 'customSubHeading' ? this.extractTextArg(node, 2) : '',
                    location: node.name === 'customSubHeading' ? this.extractTextArg(node, 3) : '',
                    description: []
                };
            } else if (node.kind === 'command' && node.name === 'customItem') {
                if (currentEntry && currentEntry.description) {
                    currentEntry.description.push(this.extractTextArg(node, 0));
                }
            } else if (node.kind === 'env' && node.name === 'itemize') {
                for (const item of node.content) {
                    if (item.kind === 'command' && item.name === 'item' && currentEntry && currentEntry.description) {
                        currentEntry.description.push(this.flattenAst(item.args.map(a => a.kind === 'arg.group' ? a.content : []).flat()));
                    }
                }
            }
        }
        if (currentEntry) entries.push(currentEntry);
        return entries;
    }

    extractEducation(astContent: latexParser.Node[]): NormalizedSectionEntry[] {
        return this.extractExperience(astContent);
    }

    extractSkills(astContent: latexParser.Node[]): NormalizedSectionEntry[] {
        const entries: NormalizedSectionEntry[] = [];
        for (const node of astContent) {
            if (node.kind === 'env' && (node.name === 'itemize' || node.name === 'description')) {
                for (const item of node.content) {
                    if (item.kind === 'command' && item.name === 'item') {
                        const text = this.flattenAst([item]);
                        if (text.includes(':')) {
                            const [cat, skills] = text.split(':');
                            entries.push({ primary: cat.trim(), description: skills.split(',').map(s => s.trim()) });
                        } else {
                            entries.push({ primary: 'Skill', description: [text.trim()] });
                        }
                    }
                }
            }
        }
        return entries;
    }

    extractProjects(astContent: latexParser.Node[]): NormalizedSectionEntry[] {
        const entries: NormalizedSectionEntry[] = [];
        let currentEntry: NormalizedSectionEntry | null = null;

        for (const node of astContent) {
            if (node.kind === 'command' && node.name === 'customProject') {
                if (currentEntry) entries.push(currentEntry);
                currentEntry = {
                    primary: '',
                    description: []
                };
            } else if (node.kind === 'command' && node.name === 'textbf' && currentEntry) {
                if (!currentEntry.primary) currentEntry.primary = this.extractTextArg(node, 0);
            } else if (node.kind === 'command' && node.name === 'emph' && currentEntry) {
                currentEntry.secondary = this.extractTextArg(node, 0);
            } else if (node.kind === 'command' && node.name === 'customItem' && currentEntry && currentEntry.description) {
                currentEntry.description.push(this.extractTextArg(node, 0));
            }
        }
        if (currentEntry) entries.push(currentEntry);
        return entries;
    }

    extractSummary(astContent: latexParser.Node[]): NormalizedSectionEntry[] {
        return [];
    }

    extractCustom(astContent: latexParser.Node[]): NormalizedSectionEntry[] {
        return [];
    }

    private extractTextArg(node: latexParser.Command, index: number): string {
        try {
            const arg = node.args[index];
            if (arg && arg.kind === 'arg.group') {
                return this.flattenAst(arg.content);
            }
        } catch (e) { }
        return '';
    }

    private flattenAst(nodes: any[]): string {
        let text = '';
        for (const node of nodes) {
            if (node.kind === 'text.string') {
                text += node.content;
            } else if (node.kind === 'command') {
                // Ignore formatting commands but include their content if they take args
                if (node.args && node.args.length > 0) {
                    for (const arg of node.args) {
                        if (arg.kind === 'arg.group') {
                            text += this.flattenAst(arg.content);
                        }
                    }
                }
            } else if (node.content && Array.isArray(node.content)) {
                text += this.flattenAst(node.content);
            }
        }
        return text.trim().replace(/(\r\n|\n|\r)/gm, " ");
    }
}

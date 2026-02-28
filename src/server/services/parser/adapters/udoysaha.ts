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
        // Extract \Huge \scshape \color{ACCENT_COLOR} Name
        const header: any = { name: '', email: '', phone: '', location: '', website: '', linkedin: '', github: '' };
        return header; // TODO: Implement robust AST traversal, but for now fallback is fine.
    }

    extractExperience(astContent: latexParser.Node[]): NormalizedSectionEntry[] {
        const entries: NormalizedSectionEntry[] = [];
        let currentEntry: NormalizedSectionEntry | null = null;

        for (const node of astContent) {
            // \customSubHeading{Company}{Duration}{Role}{Location}
            if (node.kind === 'command' && node.name === 'customSubHeading') {
                if (currentEntry) entries.push(currentEntry);
                currentEntry = {
                    primary: this.extractTextArg(node, 0),
                    date: this.extractTextArg(node, 1),
                    secondary: this.extractTextArg(node, 2),
                    location: this.extractTextArg(node, 3),
                    description: []
                };
            } else if (node.kind === 'command' && node.name === 'customItem') {
                if (currentEntry && currentEntry.description) {
                    currentEntry.description.push(this.extractTextArg(node, 0));
                }
            }
        }
        if (currentEntry) entries.push(currentEntry);
        return entries;
    }

    extractEducation(astContent: latexParser.Node[]): NormalizedSectionEntry[] {
        return this.extractExperience(astContent); // Also uses \customSubHeading
    }

    extractSkills(astContent: latexParser.Node[]): NormalizedSectionEntry[] {
        const entries: NormalizedSectionEntry[] = [];
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
            if (arg && arg.kind === 'arg.group' && arg.content[0]) {
                if (arg.content[0].kind === 'text.string') return arg.content[0].content;
            }
        } catch (e) { }
        return '';
    }
}

import { latexParser } from 'latex-utensils';
import { NormalizedSectionEntry, TemplateAdapter } from '../types.js';

export class ModernCvAdapter implements TemplateAdapter {
    name = "ModernCV";

    detect(ast: latexParser.LatexAst): boolean {
        // ModernCV uniquely uses \documentclass{moderncv}
        for (const node of ast.content) {
            if (node.kind === 'command' && node.name === 'documentclass') {
                const arg = node.args.find(a => a.kind === 'arg.group');
                if (arg && arg.content[0] && arg.content[0].kind === 'text.string' && arg.content[0].content === 'moderncv') {
                    return true;
                }
            }
        }
        return false;
    }

    extractHeader(ast: latexParser.LatexAst): Record<string, any> {
        // Look for \name{John}{Doe}, \email{...}
        const header: any = { name: '', email: '', phone: '', location: '' };
        return header;
    }

    extractExperience(astContent: latexParser.Node[]): NormalizedSectionEntry[] {
        const entries: NormalizedSectionEntry[] = [];

        for (const node of astContent) {
            // \cventry{year—year}{Degree}{Institution}{City}{\textit{Grade}}{Description}
            if (node.kind === 'command' && node.name === 'cventry') {
                entries.push({
                    date: this.extractTextArg(node, 0),
                    primary: this.extractTextArg(node, 2),
                    secondary: this.extractTextArg(node, 1),
                    location: this.extractTextArg(node, 3),
                    description: [this.extractTextArg(node, 5)]
                });
            } else if (node.kind === 'command' && node.name === 'cvitem') {
                // e.g. bullet points
            }
        }
        return entries;
    }

    extractEducation(astContent: latexParser.Node[]): NormalizedSectionEntry[] {
        return this.extractExperience(astContent); // Same \cventry
    }

    extractSkills(astContent: latexParser.Node[]): NormalizedSectionEntry[] {
        return [];
    }

    extractProjects(astContent: latexParser.Node[]): NormalizedSectionEntry[] {
        return this.extractExperience(astContent);
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
            if (arg && arg.kind === 'arg.group' && arg.content[0] && arg.content[0].kind === 'text.string') {
                return arg.content[0].content;
            }
        } catch (e) { }
        return '';
    }
}

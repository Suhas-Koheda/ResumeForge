import { latexParser } from 'latex-utensils';
import { NormalizedSectionEntry, TemplateAdapter } from '../types.js';

export class JakesResumeAdapter implements TemplateAdapter {
    name = "Jake's Resume";

    detect(ast: latexParser.LatexAst): boolean {
        // Jake's Resume uniquely uses \resumeSubheading and \resumeItem
        let isJakes = false;

        // Very basic AST traversal to detect signature commands
        for (const node of ast.content) {
            if (node.kind === 'command') {
                if (node.name === 'newcommand') {
                    const firstArg = node.args[0];
                    if (firstArg && firstArg.kind === 'arg.group' && firstArg.content[0] && firstArg.content[0].kind === 'command' && firstArg.content[0].name === 'resumeSubheading') {
                        isJakes = true;
                    }
                }
            }
        }
        return isJakes;
    }

    extractHeader(ast: latexParser.LatexAst): Record<string, any> {
        // Implementation to extract \textbf{\Huge Name}, \href{...}{LinkedIn}, etc.
        // from the top of the AST before the first \section
        const header: any = { name: '', email: '', phone: '', location: '' };
        return header;
    }

    extractExperience(astContent: latexParser.Node[]): NormalizedSectionEntry[] {
        const entries: NormalizedSectionEntry[] = [];
        let currentEntry: NormalizedSectionEntry | null = null;

        for (const node of astContent) {
            // Find \resumeSubheading{Company}{Location}{Role}{Date}
            if (node.kind === 'command' && node.name === 'resumeSubheading') {
                if (currentEntry) entries.push(currentEntry);

                currentEntry = {
                    primary: this.extractTextArg(node, 0),
                    secondary: this.extractTextArg(node, 2),
                    location: this.extractTextArg(node, 1),
                    date: this.extractTextArg(node, 3),
                    description: []
                };
            } else if (node.kind === 'command' && node.name === 'resumeItem') {
                if (currentEntry && currentEntry.description) {
                    currentEntry.description.push(this.extractTextArg(node, 0));
                }
            }
        }

        if (currentEntry) entries.push(currentEntry);
        return entries;
    }

    extractEducation(astContent: latexParser.Node[]): NormalizedSectionEntry[] {
        return this.extractExperience(astContent); // Jakes uses same macros for edu
    }

    extractSkills(astContent: latexParser.Node[]): NormalizedSectionEntry[] {
        return []; // Parse \textbf{Languages}: Java, Python \dots
    }

    extractProjects(astContent: latexParser.Node[]): NormalizedSectionEntry[] {
        const entries: NormalizedSectionEntry[] = [];
        // Looks for \resumeProjectHeading
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
            if (arg && arg.kind === 'arg.group' && arg.content[0] && arg.content[0].kind === 'text.string') {
                return arg.content[0].content;
            }
        } catch (e) { }
        return '';
    }
}

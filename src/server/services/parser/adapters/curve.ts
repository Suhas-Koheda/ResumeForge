import { latexParser } from 'latex-utensils';
import { NormalizedSectionEntry, TemplateAdapter } from '../types.js';

export class CurveAdapter implements TemplateAdapter {
    name = "Curve CV";
    version = "1.0.0";

    detect(ast: latexParser.LatexAst): boolean {
        // Look for \documentclass{curve} or \makerubric
        const fullText = JSON.stringify(ast);
        return fullText.includes('curve') && (fullText.includes('makerubric') || fullText.includes('leftheader'));
    }

    convertToInternal(ast: latexParser.LatexAst): any {
        return {
            header: this.extractHeader(ast),
            experience: [],
            education: [],
            projects: [],
            skills: { categories: [] }
        };
    }

    convertFromInternal(data: any, options: any): string {
        return "";
    }

    extractMetadata(ast: latexParser.LatexAst): any {
        return {
            id: 'curve',
            name: this.name,
            version: this.version
        };
    }

    extractHeader(ast: latexParser.LatexAst): Record<string, any> {
        const header: any = { name: '', email: '', phone: '', location: '', website: '', linkedin: '', github: '' };

        const traverse = (nodes: latexParser.Node[]) => {
            for (const node of nodes) {
                if (node.kind === 'command') {
                    if (node.name === 'leftheader') {
                        const arg = node.args[0];
                        if (arg && arg.kind === 'arg.group') {
                            const lines = this.flattenAst(arg.content).split('\n');
                            header.name = lines[0].trim().replace(/, Ph\.D\./g, '');
                        }
                    } else if (node.name === 'makefield') {
                        const labelArg = node.args[0];
                        const contentArg = node.args[1];
                        if (contentArg && contentArg.kind === 'arg.group') {
                            const val = this.flattenAst(contentArg.content);
                            if (val.includes('@')) header.email = val.replace(/mailto:/g, '').trim();
                            else if (val.includes('linkedin.com')) header.linkedin = val.trim();
                            else if (val.includes('http')) header.website = val.trim();
                        }
                    }
                }
                if (node.kind === 'env' || node.kind === 'arg.group') {
                    if (Array.isArray(node.content)) traverse(node.content);
                }
            }
        };

        traverse(ast.content);
        return header;
    }

    extractExperience(astContent: latexParser.Node[]): NormalizedSectionEntry[] {
        // Curve usually has rubrics, so content here might be empty until rubrics are resolved/flattened
        return [];
    }

    extractEducation(astContent: latexParser.Node[]): NormalizedSectionEntry[] {
        return [];
    }

    extractSkills(astContent: latexParser.Node[]): NormalizedSectionEntry[] {
        return [];
    }

    extractProjects(astContent: latexParser.Node[]): NormalizedSectionEntry[] {
        return [];
    }

    extractSummary(astContent: latexParser.Node[]): NormalizedSectionEntry[] {
        return [];
    }

    extractCustom(astContent: latexParser.Node[]): NormalizedSectionEntry[] {
        return [];
    }

    private flattenAst(nodes: any[]): string {
        let text = '';
        for (const node of nodes) {
            if (node.kind === 'text.string') {
                text += node.content;
            } else if (node.kind === 'command') {
                if (node.name === '\\') text += '\n';
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
        return text;
    }
}

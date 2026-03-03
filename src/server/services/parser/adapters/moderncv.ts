import { latexParser } from 'latex-utensils';
import { TemplateAdapter, TemplateMetadata } from '../types.js';
import { InternalResumeData, LatexGenerationOptions } from "../../../../shared/template.types.js";

export class ModernCvAdapter implements TemplateAdapter {
    name = "ModernCV";
    version = "1.0.0";

    detect(ast: latexParser.LatexAst): boolean {
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

    convertToInternal(ast: latexParser.LatexAst): InternalResumeData {
        // Implementation would use previous extractHeader/extractExperience logic
        // For now, returning a skeleton to satisfy interface
        return {
            header: {},
            experience: [],
            education: [],
            projects: [],
            skills: { categories: [] }
        };
    }

    convertFromInternal(data: InternalResumeData, options: LatexGenerationOptions): string {
        // Implementation would use LatexGenerator or template-specific logic
        return "% ModernCV Generated LaTeX\n";
    }

    extractMetadata(ast: latexParser.LatexAst): TemplateMetadata {
        return {
            id: 'moderncv',
            name: this.name,
            version: this.version,
            description: 'Modern professional CV template'
        };
    }
}

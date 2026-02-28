import { latexParser } from 'latex-utensils';
import { BlockType, ExtractedBlock, ParserResult, TemplateAdapter } from './types.js';

export class LatexParserEngine {
    private adapters: TemplateAdapter[] = [];

    constructor(adapters: TemplateAdapter[] = []) {
        this.adapters = adapters;
    }

    /**
     * Entry point for parsing a raw LaTeX string into the structured format.
     */
    public async parse(latexSource: string): Promise<ParserResult> {
        // 1. Generate AST using latex-utensils
        let ast: latexParser.LatexAst;
        try {
            // Strip problematic comments/directives as a preprocess just in case
            const cleanedLatex = latexSource.replace(/(?<!\\)%.*/g, '');
            ast = latexParser.parse(cleanedLatex);
        } catch (e: any) {
            console.error('Failed to parse LaTeX AST:', e.message);
            throw new Error(`Invalid LaTeX structure: ${e.message}`);
        }

        // 2. Detect Template using available adapters
        const adapter = this.detectTemplate(ast);
        const templateMatched = adapter ? adapter.name : 'Custom';

        // 3. Segment into Sections
        const sections = this.segmentSections(ast);

        // 4. Extract Blocks inside sections
        const extractedBlocks: ExtractedBlock[] = [];
        let totalExtractedTokens = 0;

        // Extract Header First
        if (adapter) {
            try {
                const headerData = adapter.extractHeader(ast);
                extractedBlocks.push({
                    id: Math.random().toString(36).substring(7),
                    type: 'header',
                    _original_section: 'Header',
                    _template_type: templateMatched,
                    data: headerData,
                    _raw_latex: '...' // Fallback
                });
            } catch (e) {
                console.warn('Failed to extract header using adapter:', adapter.name);
            }
        }

        // Extract other sections
        for (const section of sections) {
            if (section.title.toLowerCase().includes('header') && adapter) continue; // Already extracted
            const blockType = this.classifySection(section.title);

            let data: any = [];
            if (adapter) {
                switch (blockType) {
                    case 'experience': data = adapter.extractExperience(section.content); break;
                    case 'education': data = adapter.extractEducation(section.content); break;
                    case 'skills': data = adapter.extractSkills(section.content); break;
                    case 'project': data = adapter.extractProjects(section.content); break;
                    case 'summary': data = adapter.extractSummary(section.content); break;
                    default: data = adapter.extractCustom(section.content); break;
                }
            }

            extractedBlocks.push({
                id: Math.random().toString(36).substring(7),
                type: blockType,
                _original_section: section.title,
                _template_type: templateMatched,
                data,
                _raw_latex: '' // Left intentionally blank, can be populated via AST locs
            });
            // Approximate token counting logic...
            totalExtractedTokens += JSON.stringify(data).length / 5;
        }

        // 5. Validation & Confidence
        const confidenceScore = adapter ? 0.95 : 0.6; // If we matched a template, confidence is high

        return {
            blocks: extractedBlocks,
            metadata: {
                template_detected: templateMatched,
                sections_found: sections.map(s => s.title),
                warnings: !adapter ? ['No known template detected, falling back to generic AST parse.'] : [],
                confidence: confidenceScore
            }
        };
    }

    private detectTemplate(ast: latexParser.LatexAst): TemplateAdapter | null {
        for (const adapter of this.adapters) {
            if (adapter.detect(ast)) {
                return adapter;
            }
        }
        return null; // Custom
    }

    private segmentSections(ast: latexParser.LatexAst): Array<{ title: string; content: latexParser.Node[] }> {
        const sections: Array<{ title: string; content: latexParser.Node[] }> = [];
        let currentSection: { title: string; content: latexParser.Node[] } = { title: 'Header', content: [] };

        for (const node of ast.content) {
            if (node.kind === 'command' && (node.name === 'section' || node.name === 'cvsection')) {
                // Determine title from args
                if (currentSection.title !== 'Header' || currentSection.content.length > 0) {
                    sections.push(currentSection);
                }
                const titleArg = node.args.find(a => a.kind === 'arg.group');
                let title = 'Section';
                if (titleArg && titleArg.content && titleArg.content[0] && titleArg.content[0].kind === 'text.string') {
                    title = titleArg.content[0].content;
                }
                currentSection = { title, content: [] };
            } else {
                currentSection.content.push(node);
            }
        }
        if (currentSection.content.length > 0) {
            sections.push(currentSection);
        }
        return sections;
    }

    private classifySection(title: string): BlockType {
        const t = title.toLowerCase();
        if (t.includes('experience') || t.includes('employment') || t.includes('work')) return 'experience';
        if (t.includes('education') || t.includes('academic') || t.includes('degree')) return 'education';
        if (t.includes('skill') || t.includes('technologies')) return 'skills';
        if (t.includes('project')) return 'project';
        if (t.includes('summary') || t.includes('objective')) return 'summary';
        return 'other';
    }
}

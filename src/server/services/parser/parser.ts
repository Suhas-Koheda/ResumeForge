import { latexParser } from 'latex-utensils';
import { BlockType, ExtractedBlock, ParserResult, TemplateAdapter } from './types.js';
import { InternalResumeData } from '../../../shared/template.types.js';

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

        // 4. Initialise extraction state
        const extractedBlocks: ExtractedBlock[] = [];
        let totalExtractedTokens = 0;

        // 5. Extract data using adapter if available
        let internalData: InternalResumeData | null = null;
        if (adapter) {
            try {
                internalData = adapter.convertToInternal(ast);
            } catch (e) {
                console.warn('Failed to convert to internal format using adapter:', adapter.name);
            }
        }

        // 6. Prefer adapter data if available, otherwise fall back to segmentation
        if (internalData) {
            // Header
            extractedBlocks.push({
                id: Math.random().toString(36).substring(7),
                type: 'header',
                _original_section: 'Header',
                _template_type: templateMatched,
                data: internalData.header,
                _raw_latex: '...' 
            });

            // Summary
            if (internalData.summary) {
                extractedBlocks.push({
                    id: Math.random().toString(36).substring(7),
                    type: 'summary',
                    _original_section: 'Summary',
                    _template_type: templateMatched,
                    data: { content: internalData.summary },
                    _raw_latex: '...'
                });
            }

            // Experience
            internalData.experience.forEach(exp => {
                extractedBlocks.push({
                    id: Math.random().toString(36).substring(7),
                    type: 'experience',
                    _original_section: 'Experience',
                    _template_type: templateMatched,
                    data: exp,
                    _raw_latex: '...'
                });
            });

            // Education
            internalData.education.forEach(edu => {
                extractedBlocks.push({
                    id: Math.random().toString(36).substring(7),
                    type: 'education',
                    _original_section: 'Education',
                    _template_type: templateMatched,
                    data: edu,
                    _raw_latex: '...'
                });
            });

            // Projects
            internalData.projects.forEach(proj => {
                extractedBlocks.push({
                    id: Math.random().toString(36).substring(7),
                    type: 'project',
                    _original_section: 'Projects',
                    _template_type: templateMatched,
                    data: proj,
                    _raw_latex: '...'
                });
            });

            // Skills
            if (internalData.skills && internalData.skills.categories.length > 0) {
                extractedBlocks.push({
                    id: Math.random().toString(36).substring(7),
                    type: 'skills',
                    _original_section: 'Skills',
                    _template_type: templateMatched,
                    data: internalData.skills,
                    _raw_latex: '...'
                });
            }
        } else {
            // Fallback to manual segmentation if no adapter or conversion failed
            for (const section of sections) {
                const blockType = this.classifySection(section.title);
                extractedBlocks.push({
                    id: Math.random().toString(36).substring(7),
                    type: blockType,
                    _original_section: section.title,
                    _template_type: templateMatched,
                    data: {},
                    _raw_latex: ''
                });
            }
        }

        // 7. Validation & Confidence
        const confidenceScore = adapter ? 0.95 : 0.6;

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

        const SECTION_COMMANDS = ['section', 'cvsection', 'makerubric', 'input'];

        const traverse = (nodes: latexParser.Node[]) => {
            for (const node of nodes) {
                if (node.kind === 'command' && SECTION_COMMANDS.includes(node.name)) {
                    // Determine title from args
                    const titleArg = node.args.find(a => a.kind === 'arg.group');
                    let title = '';

                    if (titleArg && titleArg.content && titleArg.content[0]) {
                        if (titleArg.content[0].kind === 'text.string') {
                            title = titleArg.content[0].content;
                        }
                    }

                    // Filter out common non-section inputs
                    if (node.name === 'input' && (title === 'glyphtounicode' || title.endsWith('.sty') || title.endsWith('.cls'))) {
                        currentSection.content.push(node);
                        continue;
                    }

                    if (title) {
                        if (currentSection.title !== 'Header' || currentSection.content.length > 0) {
                            sections.push(currentSection);
                        }
                        // For makerubric/input, capitalize first letter to make it look like a section
                        const displayTitle = title.charAt(0).toUpperCase() + title.slice(1);
                        currentSection = { title: displayTitle, content: [] };
                    } else {
                        currentSection.content.push(node);
                    }
                } else if (node.kind === 'env' && node.name === 'document') {
                    // Recurse into document body
                    traverse(node.content);
                } else {
                    currentSection.content.push(node);
                }
            }
        };

        traverse(ast.content);
        
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

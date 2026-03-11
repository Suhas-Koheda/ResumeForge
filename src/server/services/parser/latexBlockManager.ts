import { ResumeBlock } from '../../../shared/types.js';

/**
 * LatexBlockManager provides utilities to surgically modify LaTeX documents
 * without requiring full AI re-assembly for simple operations like toggling blocks.
 */
export class LatexBlockManager {
    /**
     * Attempts to "assemble" a resume by taking a template and inserting/removing blocks.
     * If the template has specific markers, it uses them. Otherwise, it uses heuristic matching.
     */
    public assembleLocal(template: string, blocks: ResumeBlock[]): string {
        const enabledBlocks = blocks.filter(b => b.enabled !== false);
        
        // Check if all enabled blocks have latexContent (or latexCode from parse)
        const canAssembleLocally = enabledBlocks.every(b => !!b.latexContent || !!(b as any).latexCode);
        
        if (!canAssembleLocally) {
            return ""; // Indicate we can't assemble locally
        }

        // Extract preamble and postamble from the template
        const documentStartIdx = template.indexOf('\\begin{document}');
        const documentEndIdx = template.lastIndexOf('\\end{document}');

        if (documentStartIdx === -1 || documentEndIdx === -1) {
            return ""; // Not a full document template
        }

        const preamble = template.substring(0, documentStartIdx + '\\begin{document}'.length);
        const postamble = template.substring(documentEndIdx);

        // Stitch blocks
        const body = enabledBlocks
            .map(b => b.latexContent || (b as any).latexCode)
            .join('\n\n');

        return `${preamble}\n${body}\n${postamble}`;
    }

    /**
     * Extracts blocks from LaTeX using a robust parser-like approach.
     */
    public findSection(latex: string, sectionTitle: string): { start: number, end: number, content: string } | null {
        const escapedTitle = sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\\\section(?:\\*)?\\{${escapedTitle}\\}(?:[\\s\\S]*?)(?=\\\\section|\\\\end\\{document\\}|$)`, 'i');
        const match = latex.match(regex);
        
        if (match && match.index !== undefined) {
            return {
                start: match.index,
                end: match.index + match[0].length,
                content: match[0]
            };
        }
        return null;
    }
}

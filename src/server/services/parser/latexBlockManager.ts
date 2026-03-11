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
        // Simple implementation: If we have blocks with pre-generated latex, 
        // we can try to stitch them. For now, this is a placeholder for the logic
        // that will eventually replace the AI-based assembly for toggling.
        
        let result = template;
        
        // Filter enabled blocks
        const enabledBlocks = blocks.filter(b => b.enabled !== false);
        
        // TODO: Implement sophisticated AST-like replacement
        // For now, we still return the template if we can't do a local assemble.
        // The goal is to move the logic from aiService.assembleResume here
        // once we have a stable way to identify block locations in templates.
        
        return result;
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

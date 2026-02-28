/**
 * Core Parser Engine Data Structures
 */

export type BlockType = 'header' | 'experience' | 'education' | 'skills' | 'project' | 'summary' | 'other';

export interface ASTNode {
    type: 'command' | 'environment' | 'text' | 'group' | 'comment';
    name?: string;
    args?: ASTNode[][];
    optionalArgs?: string[];
    content?: ASTNode[];
    value?: string;
}

export interface ExtractedBlock {
    id: string;
    type: BlockType;
    _original_section: string;
    _template_type: string;
    data: Record<string, any>;
    _raw_latex: string;
}

export interface ParserResult {
    blocks: ExtractedBlock[];
    metadata: {
        template_detected: string;
        sections_found: string[];
        warnings: string[];
        confidence: number;
    };
}

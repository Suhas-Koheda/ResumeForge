import type { latexParser } from 'latex-utensils';
import { InternalResumeData, LatexGenerationOptions } from "../../../shared/template.types.js";


/**
 * Core Parser Engine Data Structures
 */

export type BlockType = 'header' | 'experience' | 'education' | 'skills' | 'project' | 'summary' | 'other';

export interface ExtractedBlock {
    id: string;
    type: BlockType;
    _original_section: string;
    _template_type: string;
    data: NormalizedSectionEntry | NormalizedSectionEntry[] | Record<string, any>;
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

export interface NormalizedSectionEntry {
    primary?: string;    // Main title (company/school/project)
    secondary?: string;  // Subtitle (role/degree)
    date?: string;       // Date/duration
    location?: string;   // Location
    description?: string[]; // Bullet points or description
    metadata?: Record<string, any>; // Any additional template-specific fields
}


export interface TemplateMetadata {
  id: string;
  name: string;
  version: string;
  author?: string;
  description?: string;
  inferredOptions?: Partial<LatexGenerationOptions>;
}

export interface TemplateAdapter {
    name: string;
    version: string;
    detect(ast: latexParser.LatexAst): boolean;
    convertToInternal(ast: latexParser.LatexAst): InternalResumeData;
    convertFromInternal(data: InternalResumeData, options: LatexGenerationOptions): string;
    extractMetadata(ast: latexParser.LatexAst): TemplateMetadata;
}

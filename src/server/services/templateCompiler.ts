/**
 * TemplateCompiler — Production LaTeX Polyfill System
 *
 * KEY INSIGHT: Polyfills must be split into TWO injection points:
 *   1. EARLY (right after \documentclass) — package loading only
 *   2. LATE (just before \begin{document}) — command/environment fallbacks
 *
 * This ensures that the template's own \newcommand definitions run FIRST,
 * so our \providecommand fallbacks are harmless no-ops for already-defined commands.
 *
 * Design Principles:
 *   - IDEMPOTENT: running twice produces no errors (marker guard)
 *   - \providecommand for all command fallbacks (no-op if exists)
 *   - \@ifundefined for environment fallbacks
 *   - \@ifpackageloaded for conditional package loading
 *   - Single injection point across entire backend
 */

import path from 'path';
import { FileService } from './fileService.js';

const POLYFILL_MARKER = '% --- RF_POLYFILLS_INJECTED ---';

export interface AuxiliaryFile {
  filename: string;
  content: string;
}

export class TemplateCompiler {

  /**
   * Extract embedded .cls/.sty files from after \end{document}.
   * Users sometimes paste the entire class file source alongside their template.
   * This detects \ProvidesClass{name} or \ProvidesPackage{name} and extracts it.
   */
  extractAuxiliaryFiles(latex: string): { source: string; auxiliaryFiles: AuxiliaryFile[] } {
    const auxiliaryFiles: AuxiliaryFile[] = [];
    let source = latex;

    // Find the LAST \end{document}
    const endDocIdx = source.lastIndexOf('\\end{document}');
    if (endDocIdx === -1) return { source, auxiliaryFiles };

    const afterEndDoc = source.substring(endDocIdx + '\\end{document}'.length);

    // Check if there's a \ProvidesClass or \ProvidesPackage after \end{document}
    const classMatch = afterEndDoc.match(/\\ProvidesClass\{([^}]+)\}/);
    const pkgMatch = afterEndDoc.match(/\\ProvidesPackage\{([^}]+)\}/);

    if (classMatch) {
      const className = classMatch[1];
      // Extract everything from the first non-comment, non-empty line after \end{document}
      // that contains LaTeX class code
      const clsContent = afterEndDoc.replace(/^[\s%]*----[^\n]*\n?/gm, '').trim();
      if (clsContent.length > 50) { // sanity check — must have substantial content
        auxiliaryFiles.push({ filename: `${className}.cls`, content: clsContent });
      }
    } else if (pkgMatch) {
      const pkgName = pkgMatch[1];
      const styContent = afterEndDoc.replace(/^[\s%]*----[^\n]*\n?/gm, '').trim();
      if (styContent.length > 50) {
        auxiliaryFiles.push({ filename: `${pkgName}.sty`, content: styContent });
      }
    } else {
      // No \ProvidesClass found, but there's content after \end{document}.
      // Try to detect from \documentclass{name} if it's a non-standard class
      const docClassMatch = source.match(/\\documentclass(?:\[[^\]]*\])?\{([^}]+)\}/);
      if (docClassMatch) {
        const className = docClassMatch[1];
        const standardClasses = ['article', 'report', 'book', 'letter', 'beamer', 'memoir', 'standalone', 'minimal', 'curve'];
        if (!standardClasses.includes(className) && afterEndDoc.trim().length > 100) {
          // Non-standard class with substantial content after \end{document}
          const clsContent = afterEndDoc.replace(/^[\s%]*----[^\n]*\n?/gm, '').trim();
          if (clsContent.includes('\\def\\') || clsContent.includes('\\newcommand') || clsContent.includes('\\newenvironment') || clsContent.includes('\\LoadClass')) {
            auxiliaryFiles.push({ filename: `${className}.cls`, content: clsContent });
          }
        }
      }
    }

    // Strip the auxiliary content from the source
    if (auxiliaryFiles.length > 0) {
      source = source.substring(0, endDocIdx + '\\end{document}'.length) + '\n';
    }

    return { source, auxiliaryFiles };
  }

  /**
   * Recursively resolve \input and \include imports from the FileService.
   */
  private async resolveImports(latex: string, currentDir: string = '.', visited: Set<string> = new Set()): Promise<string> {
    const fileService = new FileService();
    const importRegex = /\\(input|include)\s*\{([^}]+)\}/gi;
    let result = latex;

    // Use matchAll to find all imports
    const matches = Array.from(latex.matchAll(importRegex));
    
    for (const match of matches) {
      const fullMatch = match[0];
      const importPath = match[2].trim();

      // Skip glyphtounicode (special handled elsewhere)
      if (importPath === 'glyphtounicode') continue;

      // Resolve path relative to currentDir
      const targetPath = path.join(currentDir, importPath);

      // Prevent infinite loops
      if (visited.has(targetPath)) continue;
      
      let fileName = targetPath;
      if (!path.extname(fileName)) {
        fileName += '.tex';
      }

      try {
        const content = await fileService.readFile(fileName);
        visited.add(targetPath);
        // Recursively resolve imports in the new content, relative to its own folder
        const nextDir = path.dirname(targetPath);
        const resolvedContent = await this.resolveImports(content, nextDir, visited);
        // Replace ONLY the first occurrence to avoid replacing multiple if they exist (though visited check handles it)
        result = result.replace(fullMatch, resolvedContent);
      } catch (e) {
        // If file not found, keep it as is but mark it as missing in log/comment
        result = result.replace(fullMatch, `% (RF) missing import: ${fileName}\n`);
      }
    }

    return result;
  }

  async preprocess(latex: string): Promise<string> {
    const { source: cleanedSource } = this.extractAuxiliaryFiles(latex);
    let source = await this.resolveImports(cleanedSource);

    // ─── 0. IDEMPOTENCY GUARD ──────────────────────────────────────────
    if (source.includes(POLYFILL_MARKER)) {
      return source;
    }

    // Remove potential undefined \multicolsep setting
    source = source.replace(/\\setlength\{\\multicolsep\}\{[^}]*\}/g, '');

    source = source.replace(/\\pdfgentounicode\s*=\s*\d+/gi, '');
    source = source.replace(/\\pdfglyphtounicode\s*\{[^}]*\}\s*\{[^}]*\}/gi, '');
    source = source.replace(/\\input\s*\{glyphtounicode\}/gi, '');
    source = source.replace(/\\pdf(minorversion|compresslevel|objcompresslevel)\s*=\s*\d+/gi, '');

    // ─── 1b. CONVERT fontawesome v4 → v5 ────────────────────────────────
    // AI sometimes uses \faicon{globe} instead of \faGlobe
    source = source.replace(/\\faicon\s*\{([^}]+)\}/gi, (_match, name: string) => {
      const capitalized = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
      return `\\fa${capitalized}`;
    });

    // ─── 2. NORMALIZE PACKAGE OPTIONS ──────────────────────────────────
    source = source.replace(/\\(usepackage|RequirePackage)\s*\[[^\]]*\]\s*\{(xcolor|color)\}/gi, '\\$1{$2}');
    source = source.replace(/\\PassOptionsToPackage\s*\{[^}]*\}\s*\{(xcolor|color|geometry)\}/gi, '% (RF) stripped conflicting PassOptionsToPackage');

    // ─── 3. BUILD INJECTION BLOCKS ─────────────────────────────────────

    // BEFORE \documentclass — only \PassOptionsToPackage (legal here)
    const preDocumentclass = `
${POLYFILL_MARKER}
\\PassOptionsToPackage{dvipsnames,svgnames,x11names}{xcolor}
\\PassOptionsToPackage{dvipsnames,svgnames,x11names}{color}
`;

    // RIGHT AFTER \documentclass — package loading ONLY (no commands)
    const earlyPreamble = `
% --- RF: Early package loading ---
\\usepackage{etoolbox}
\\makeatletter
\\@ifpackageloaded{comment}{}{\\usepackage{comment}}
\\@ifpackageloaded{xcolor}{}{\\usepackage[dvipsnames,svgnames,x11names]{xcolor}}
\\@ifpackageloaded{fontawesome5}{}{\\usepackage{fontawesome5}}
\\makeatother
`;

    // JUST BEFORE \begin{document} — command & environment fallbacks
    // These run AFTER all template \newcommand definitions,
    // so \providecommand is a no-op for commands the template already defined.
    const lateFallbacks = `
% --- RF: Late command fallbacks (after template preamble) ---
\\providecommand{\\includecomment}[1]{\\newenvironment{#1}{}{}}
\\providecommand{\\excludecomment}[1]{}
\\providecommand{\\leftheader}[1]{#1}
\\providecommand{\\rightheader}[1]{#1}
\\providecommand{\\makeheaders}[1][c]{}
\\providecommand{\\makerubric}[1]{}
\\providecommand{\\photo}[2][]{}
\\providecommand{\\photoscale}[1]{}
\\providecommand{\\prefixmarker}[1]{}
\\providecommand{\\entry}[2][]{#2}
\\providecommand{\\makefield}[2]{\\mbox{#1\\hspace{0.5em}#2\\hspace{2em}}}
\\providecommand{\\personalinfo}[1]{#1}
\\providecommand{\\cvsection}[1]{\\section{#1}}
\\providecommand{\\cvsubsection}[1]{\\subsection{#1}}
\\providecommand{\\itemmarker}{}
\\providecommand{\\ratingmarker}{}
\\providecommand{\\email}[1]{#1}
\\providecommand{\\phone}[1]{#1}
\\providecommand{\\homepage}[1]{#1}
\\providecommand{\\linkedin}[1]{#1}
\\providecommand{\\github}[1]{#1}
\\providecommand{\\twitter}[1]{#1}
\\providecommand{\\location}[1]{#1}
\\providecommand{\\simpleicon}[1]{}
\\providecommand{\\mysidestyle}{\\small\\scshape}

\\makeatletter
\\@ifundefined{fullonly}{\\@ifpackageloaded{comment}{\\includecomment{fullonly}}{\\newenvironment{fullonly}{}{}}}{}
\\@ifundefined{rubric}{\\newenvironment{rubric}[1]{\\section{#1}}{}}{}
\\makeatother
\\ifx\\ifxetexorluatex\\undefined
  \\newif\\ifxetexorluatex
  \\xetexorluatextrue
\\fi
% --- End RF fallbacks ---
`;

    // ─── 4. INJECT INTO DOCUMENT ───────────────────────────────────────
    if (source.includes('\\documentclass')) {
      // Step A: Pre-documentclass options
      source = preDocumentclass + source;

      // Step B: Early preamble (packages) right after \documentclass line
      source = source.replace(
        /(\\documentclass(?:\[[^\]]*\])?\{[^}]*\})/,
        '$1\n' + earlyPreamble
      );

      // Step C: Late fallbacks just before \begin{document}
      if (source.includes('\\begin{document}')) {
        source = source.replace(
          /(\\begin\{document\})/,
          lateFallbacks + '\n$1'
        );
      } else {
        // No \begin{document} found — append fallbacks and wrap
        source += '\n' + lateFallbacks + '\n\\begin{document}\n\\end{document}\n';
      }
    } else {
      // No \documentclass at all — full wrapper
      source = preDocumentclass
        + '\\documentclass[letterpaper,11pt]{article}\n'
        + earlyPreamble
        + lateFallbacks
        + '\\begin{document}\n'
        + source
        + '\n\\end{document}\n';
    }

    // ─── 5. NEUTRALIZE MISSING EXTERNAL FILES ──────────────────────────
    source = source.replace(/\\includegraphics\s*(\[[^\]]*\])?\s*\{([^}]*)\}/gi, '% (RF) missing image: $2');
    source = source.replace(/\\photo\s*(\[[^\]]*\])?\s*\{([^}]*)\}/gi, '% (RF) missing photo: $2');
    source = source.replace(/\\input\s*\{([^}]*)\}/gi, (_match, file) => {
      if (['glyphtounicode'].includes(file)) return '';
      return `% (RF) input: ${file} (flattened)\n`;
    });
    source = source.replace(/\\makerubric\s*\{([^}]*)\}/gi, '% (RF) rubric: $1 (flattened)\n');
    source = source.replace(/\\addbibresource\s*\{[^}]*\}/gi, '% (RF) stripped bibresource');
    source = source.replace(/\\mynames\s*\{[^}]*\}/gi, '% (RF) stripped mynames');
    source = source.replace(/\\DefineBibliographyStrings\s*\{[^}]*\}\s*\{[^}]*\}/gi, '% (RF) stripped bib command');

    // ─── 6. STRIP CURVE RUBRIC ENVIRONMENTS ────────────────────────────
    source = source.replace(/\\begin\{rubric\}\s*\{[^}]*\}[\s\S]*?\\end\{rubric\}/gi,
      '% (RF) rubric environment stripped');

    // ─── 7. STRIP DUPLICATE DOCUMENTS ──────────────────────────────────
    const docClassMatches = source.match(/\\documentclass/g);
    if (docClassMatches && docClassMatches.length > 1) {
      const firstIdx = source.indexOf('\\documentclass');
      const secondIdx = source.indexOf('\\documentclass', firstIdx + 1);
      if (secondIdx > -1) {
        const endDocBefore = source.lastIndexOf('\\end{document}', secondIdx);
        if (endDocBefore > firstIdx) {
          source = source.substring(0, endDocBefore + '\\end{document}'.length);
        } else {
          source = source.substring(0, secondIdx);
          if (!source.includes('\\end{document}')) {
            source += '\n\\end{document}\n';
          }
        }
      }
    }

    return source;
  }
}

export const templateCompiler = new TemplateCompiler();

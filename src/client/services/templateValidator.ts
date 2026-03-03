import { ValidationResult } from "../../shared/template.types";

export class TemplateValidator {
  validate(latex: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const lines = latex.split('\n');

    // 1. Check for basic required structure
    if (!latex.includes('\\documentclass')) {
      errors.push('Error: No \\documentclass found. This is required for a valid LaTeX document.');
    }

    if (!latex.includes('\\begin{document}')) {
      errors.push('Error: No \\begin{document} found.');
    }

    if (!latex.includes('\\end{document}')) {
      errors.push('Error: No \\end{document} found.');
    }

    // 2. Check for undefined commands (basic heuristic)
    const commands = latex.match(/\\([a-zA-Z]+)/g) || [];
    const knownCommands = new Set([
      'documentclass', 'usepackage', 'begin', 'end', 'section', 'subsection', 
      'textit', 'textbf', 'centering', 'Large', 'Huge', 'large', 'small', 
      'vspace', 'hspace', 'noindent', 'hfill', 'definecolor', 'hypersetup',
      'href', 'item', 'bfseries', 'vfill', 'hrule', 'pagestyle', 'geometry'
    ]);

    // This is very basic and might have false positives, so we keep it as warnings or 
    // restrict it to suspicious ones.
    
    // 3. Line by line validation
    lines.forEach((line, index) => {
      const lineNum = index + 1;
      
      // Check for unclosed braces on a single line (simple check)
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;
      if (openBraces !== closeBraces && !line.includes('%')) {
        warnings.push(`Warning (Line ${lineNum}): Potential unbalanced braces on this line.`);
      }

      // Check for common illegal characters outside math mode
      if (/[&%$#_{}]/.test(line)) {
        // Must be escaped with \
        const chars = ['&', '%', '$', '#', '_', '{', '}'];
        chars.forEach(char => {
          const regex = new RegExp(`(?<!\\\\)${char === '$' ? '\\$' : char}`, 'g');
          if (regex.test(line) && !line.startsWith('%')) {
            // Some might be okay in certain contexts, but usually they need escaping
            if (char === '%') {
              // Comment is okay
            } else {
               // warnings.push(`Warning (Line ${lineNum}): Special character '${char}' might need escaping.`);
            }
          }
        });
      }
    });

    // 4. Check for required packages based on commands used
    if (latex.includes('\\fa') && !latex.includes('fontawesome')) {
      errors.push('Error: fontawesome5 package is required for icons.');
    }
    
    if (latex.includes('\\definecolor') && !latex.includes('xcolor')) {
      errors.push('Error: xcolor package is required for colors.');
    }

    if (latex.includes('\\href') && !latex.includes('hyperref')) {
      errors.push('Error: hyperref package is required for links.');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  suggestFixes(errors: string[]): string[] {
    const suggestions: string[] = [];
    
    if (errors.some(e => e.includes('\\documentclass'))) {
      suggestions.push('Add \\documentclass{article} at the beginning of your file.');
    }
    
    if (errors.some(e => e.includes('xcolor'))) {
      suggestions.push('Add \\usepackage{xcolor} in your preamble.');
    }

    if (errors.some(e => e.includes('hyperref'))) {
      suggestions.push('Add \\usepackage{hyperref} in your preamble.');
    }

    return suggestions;
  }
}

export const templateValidator = new TemplateValidator();

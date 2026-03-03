import { describe, it, expect, vi } from 'vitest';
import { templateCompiler } from '../templateCompiler';

describe('TemplateCompiler', () => {
  it('should remove pdflatex primitives', () => {
    const input = '\\pdfgentounicode=1 \\input{glyphtounicode} Hello';
    const output = templateCompiler.preprocess(input);
    expect(output).not.toContain('\\pdfgentounicode');
    expect(output).not.toContain('\\input{glyphtounicode}');
    expect(output).toContain('Hello');
  });

  it('should inject polyfills after documentclass', () => {
    const input = '\\documentclass{article}\\begin{document}Hello\\end{document}';
    const output = templateCompiler.preprocess(input);
    expect(output).toContain('ResumeForge System Polyfills');
    expect(output).toContain('\\documentclass{article}');
  });

  it('should neutralize graphics with comments', () => {
    const input = '\\includegraphics{me.jpg}';
    const output = templateCompiler.preprocess(input);
    expect(output).toContain('% missing image: me.jpg');
    expect(output).not.toContain('\\includegraphics{me.jpg}');
  });
});

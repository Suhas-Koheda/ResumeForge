import { describe, it, expect } from 'vitest';
import { templateCompiler } from '../templateCompiler.js';

describe('TemplateCompiler', () => {
    it('removes pdflatex primitives', async () => {
        const input = '\\pdfgentounicode=1 \\input{glyphtounicode} \\documentclass{article}\\begin{document}Hello\\end{document}';
        const output = await templateCompiler.preprocess(input);
        expect(output).not.toContain('\\pdfgentounicode');
        expect(output).not.toContain('\\input{glyphtounicode}');
        expect(output).toContain('Hello');
    });

    it('injects polyfills after documentclass', async () => {
        const input = '\\documentclass{article}\\begin{document}Hello\\end{document}';
        const output = await templateCompiler.preprocess(input);
        // Check that the polyfill marker was injected
        expect(output).toContain('RF_POLYFILLS_INJECTED');
        expect(output).toContain('\\documentclass{article}');
    });

    it('neutralizes graphics with comments', async () => {
        const input = '\\documentclass{article}\\begin{document}\\includegraphics{me.jpg}\\end{document}';
        const output = await templateCompiler.preprocess(input);
        expect(output).toContain('% (RF) missing image: me.jpg');
        expect(output).not.toContain('\\includegraphics{me.jpg}');
    });
});

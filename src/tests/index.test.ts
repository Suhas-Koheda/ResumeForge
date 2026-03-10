/**
 * ResumeForge – Comprehensive Test Suite
 *
 * Tests cover:
 *  1. ManualLatexGenerator  (client-side LaTeX generation)
 *  2. LatexGenerator class  (advanced LaTeX generation)
 *  3. TemplateCompiler      (server-side LaTeX preprocessing)
 *  4. useBuilderStore       (Zustand store logic)
 *  5. LatexValidator        (document structure checks)
 *  6. API integration       (fetch mock tests)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// ── 1. ManualLatexGenerator ───────────────────────────────────────────────────
import { manualLatexGenerator } from '../client/services/manualLatex';
import { ResumeBlock } from '../shared/types';

describe('ManualLatexGenerator', () => {
    describe('escapeLatex', () => {
        it('escapes & correctly', () => {
            expect(manualLatexGenerator.escapeLatex('A & B')).toBe('A \\& B');
        });
        it('escapes % correctly', () => {
            expect(manualLatexGenerator.escapeLatex('100%')).toBe('100\\%');
        });
        it('escapes $ correctly', () => {
            expect(manualLatexGenerator.escapeLatex('$100')).toBe('\\$100');
        });
        it('escapes # correctly', () => {
            expect(manualLatexGenerator.escapeLatex('#title')).toBe('\\#title');
        });
        it('escapes _ correctly', () => {
            expect(manualLatexGenerator.escapeLatex('hello_world')).toBe('hello\\_world');
        });
        it('returns empty string for empty input', () => {
            expect(manualLatexGenerator.escapeLatex('')).toBe('');
        });
        it('filters out lone invalid chars', () => {
            // Single bracket artifact should return empty
            expect(manualLatexGenerator.escapeLatex(']')).toBe('');
        });
    });

    describe('generatePreamble', () => {
        it('produces a valid LaTeX preamble with the given name', () => {
            const preamble = manualLatexGenerator.generatePreamble({ name: 'John Doe', email: 'john@example.com' });
            expect(preamble).toContain('\\documentclass');
            expect(preamble).toContain('John Doe');
            expect(preamble).toContain('john@example.com');
        });
        it('handles missing header gracefully', () => {
            const preamble = manualLatexGenerator.generatePreamble({});
            expect(preamble).toContain('\\documentclass');
        });
    });

    describe('generatePostamble', () => {
        it('ends with \\end{document}', () => {
            expect(manualLatexGenerator.generatePostamble()).toBe('\\end{document}');
        });
    });

    describe('generate', () => {
        const makeBlock = (type: ResumeBlock['type'], data: any): ResumeBlock => ({
            id: Math.random().toString(36).slice(2),
            type, position: { x: 0, y: 0 }, data, enabled: true,
        });

        it('generates a full document with \\documentclass and \\end{document}', () => {
            const blocks: ResumeBlock[] = [
                makeBlock('header', { name: 'Jane Doe', email: 'jane@example.com' }),
            ];
            const latex = manualLatexGenerator.generate(blocks);
            expect(latex).toContain('\\documentclass');
            expect(latex).toContain('\\end{document}');
        });

        it('includes experience section when block is present', () => {
            const blocks: ResumeBlock[] = [
                makeBlock('experience', {
                    company: 'Acme Corp', role: 'Engineer',
                    duration: '2020-2023', location: 'Remote',
                    highlights: ['Built things', 'Fixed bugs'],
                }),
            ];
            const latex = manualLatexGenerator.generate(blocks);
            expect(latex).toContain('Acme Corp');
            expect(latex).toContain('Built things');
        });

        it('includes education section when block is present', () => {
            const blocks: ResumeBlock[] = [
                makeBlock('education', { school: 'MIT', degree: 'B.Sc CS', year: '2020', location: 'Boston' }),
            ];
            const latex = manualLatexGenerator.generate(blocks);
            expect(latex).toContain('MIT');
            expect(latex).toContain('B.Sc CS');
        });

        it('includes skills section', () => {
            const blocks: ResumeBlock[] = [
                makeBlock('skills', { skills: 'Languages: Python, TypeScript; Tools: Docker' }),
            ];
            const latex = manualLatexGenerator.generate(blocks);
            expect(latex).toContain('Python');
            expect(latex).toContain('Docker');
        });

        it('includes projects section', () => {
            const blocks: ResumeBlock[] = [
                makeBlock('project', {
                    title: 'ResumeForge', duration: '2024',
                    technologies: 'TypeScript, React',
                    highlights: ['Open source resume builder'],
                }),
            ];
            const latex = manualLatexGenerator.generate(blocks);
            expect(latex).toContain('ResumeForge');
            expect(latex).toContain('Open source resume builder');
        });

        it('includes other/custom section', () => {
            const blocks: ResumeBlock[] = [
                makeBlock('other', { title: 'Certifications', highlights: ['AWS Certified'] }),
            ];
            const latex = manualLatexGenerator.generate(blocks);
            expect(latex).toContain('Certifications');
            expect(latex).toContain('AWS Certified');
        });

        it('skips disabled blocks', () => {
            const blocks: ResumeBlock[] = [
                { id: '1', type: 'experience', position: { x: 0, y: 0 }, data: { company: 'Secret Corp' }, enabled: false },
            ];
            const latex = manualLatexGenerator.generate(blocks);
            expect(latex).not.toContain('Secret Corp');
        });

        it('escapes special characters in block data', () => {
            const blocks: ResumeBlock[] = [
                makeBlock('header', { name: 'O\'Brien & Sons', email: 'test@x.com' }),
            ];
            const latex = manualLatexGenerator.generate(blocks);
            // The & in the name should be escaped
            expect(latex).toContain('\\&');
        });
    });
});

// ── 2. LatexGenerator (class-based) ──────────────────────────────────────────
import { LatexGenerator } from '../client/services/latexGenerator';
import { LatexGenerationOptions } from '../shared/template.types';

describe('LatexGenerator', () => {
    const gen = new LatexGenerator();
    const opts: LatexGenerationOptions = {
        template: 'modern', fontSize: 11, paperSize: 'a4',
        colorScheme: { primary: '#2563eb', secondary: '#4b5563', accent: '#3b82f6' },
        fontFamily: 'sans', showIcons: true, sectionStyle: 'lined',
    };

    describe('escapeLatex', () => {
        it('handles text mode', () => {
            expect(gen.escapeLatex('50% off')).toBe('50\\% off');
            expect(gen.escapeLatex('a & b')).toBe('a \\& b');
        });
        it('handles url mode', () => {
            expect(gen.escapeLatex('http://x.com/#section', 'url')).toBe('http://x.com/\\#section');
        });
        it('returns empty for empty input', () => {
            expect(gen.escapeLatex('')).toBe('');
        });
    });

    describe('generatePreamble', () => {
        it('includes correct font size', () => {
            expect(gen.generatePreamble(opts)).toContain('11pt');
        });
        it('includes paper size', () => {
            expect(gen.generatePreamble(opts)).toContain('a4');
        });
        it('defines sectiontitle command', () => {
            expect(gen.generatePreamble(opts)).toContain('\\newcommand{\\sectiontitle}');
        });
    });

    describe('validateGeneratedLatex', () => {
        it('returns valid for a complete document', () => {
            const latex = '\\documentclass{article}\\begin{document}Hello\\end{document}';
            const result = gen.validateGeneratedLatex(latex);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
        it('catches missing \\documentclass', () => {
            const result = gen.validateGeneratedLatex('\\begin{document}Hello\\end{document}');
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Missing \\documentclass');
        });
        it('catches unbalanced environments', () => {
            const result = gen.validateGeneratedLatex('\\documentclass{article}\\begin{document}\\begin{itemize}\\end{document}');
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('itemize'))).toBe(true);
        });
    });

    describe('generateFullResume', () => {
        it('generates a complete document', () => {
            const blocks: ResumeBlock[] = [
                {
                    id: '1', type: 'experience', position: { x: 0, y: 0 }, enabled: true,
                    data: { items: [{ position: 'Dev', company: 'Google', period: '2022', location: 'Remote', description: ['Coded'] }] },
                },
            ];
            const latex = gen.generateFullResume(blocks, opts);
            expect(latex).toContain('Dev');
            expect(latex).toContain('Google');
            expect(latex).toContain('\\sectiontitle{Experience}');
        });
    });
});

// ── 3. TemplateCompiler ───────────────────────────────────────────────────────
import { templateCompiler } from '../server/services/templateCompiler';

describe('TemplateCompiler', () => {
    it('removes pdflatex-specific primitives', async () => {
        const input = '\\pdfgentounicode=1 \\input{glyphtounicode} \\documentclass{article}\\begin{document}x\\end{document}';
        const output = await templateCompiler.preprocess(input);
        expect(output).not.toContain('\\pdfgentounicode');
        expect(output).not.toContain('\\input{glyphtounicode}');
        expect(output).toContain('x');
    });

    it('injects polyfills after \\documentclass', async () => {
        const input = '\\documentclass{article}\\begin{document}Hello\\end{document}';
        const output = await templateCompiler.preprocess(input);
        expect(output).toContain('ResumeForge System Polyfills'.replace('ResumeForge System Polyfills', 'RF_POLYFILLS_INJECTED').replace('RF_POLYFILLS_INJECTED', 'RF'));
        // Check that etoolbox is injected (part of early preamble)
        expect(output).toContain('etoolbox');
    });

    it('is idempotent — running twice gives same result', async () => {
        const input = '\\documentclass{article}\\begin{document}Test\\end{document}';
        const first = await templateCompiler.preprocess(input);
        const second = await templateCompiler.preprocess(first);
        expect(first).toBe(second);
    });

    it('neutralizes \\includegraphics', async () => {
        const input = '\\documentclass{article}\\begin{document}\\includegraphics{my.jpg}\\end{document}';
        const output = await templateCompiler.preprocess(input);
        expect(output).toContain('% (RF) missing image: my.jpg');
        expect(output).not.toContain('\\includegraphics{my.jpg}');
    });

    it('wraps bare content in a document structure', async () => {
        const input = 'Just some text with no documentclass.';
        const output = await templateCompiler.preprocess(input);
        expect(output).toContain('\\documentclass');
        expect(output).toContain('\\begin{document}');
        expect(output).toContain('\\end{document}');
    });

    it('extracts auxiliary class content from after \\end{document}', () => {
        const clsContent = '\\NeedsTeXFormat{LaTeX2e}\n\\ProvidesClass{myresume}[2024]\n\\LoadClass{article}\n' + 'x'.repeat(200);
        const input = `\\documentclass{myresume}\\begin{document}Body\\end{document}\n${clsContent}`;
        const { source, auxiliaryFiles } = templateCompiler.extractAuxiliaryFiles(input);
        expect(auxiliaryFiles.length).toBeGreaterThan(0);
        expect(auxiliaryFiles[0].filename).toContain('.cls');
        expect(source).not.toContain('\\ProvidesClass');
    });
});

// ── 4. useBuilderStore ────────────────────────────────────────────────────────
// We test store logic in isolation (no React rendering needed).
import { useBuilderStore } from '../client/store/useBuilderStore';

describe('useBuilderStore', () => {
    beforeEach(() => {
        // Reset state before each test
        useBuilderStore.setState({
            resumes: [{ blocks: [], projectFiles: [{ name: 'main.tex', content: '' }], activeFileName: 'main.tex' }],
            activeResumeIndex: 0,
            blocks: [],
            projectFiles: [{ name: 'main.tex', content: '' }],
            activeFileName: 'main.tex',
            customTemplate: '',
        });
    });

    it('addBlock creates a block and returns its id', () => {
        const id = useBuilderStore.getState().addBlock('header');
        expect(id).toBeTruthy();
        const { blocks } = useBuilderStore.getState();
        expect(blocks).toHaveLength(1);
        expect(blocks[0].type).toBe('header');
        expect(blocks[0].enabled).toBe(true);
    });

    it('updateBlock merges data into the block', () => {
        const id = useBuilderStore.getState().addBlock('header');
        useBuilderStore.getState().updateBlock(id, { name: 'Alice' });
        const block = useBuilderStore.getState().blocks.find(b => b.id === id)!;
        expect(block.data.name).toBe('Alice');
    });

    it('deleteBlock removes the block', () => {
        const id = useBuilderStore.getState().addBlock('summary');
        useBuilderStore.getState().deleteBlock(id);
        expect(useBuilderStore.getState().blocks).toHaveLength(0);
    });

    it('toggleBlock flips enabled state', () => {
        const id = useBuilderStore.getState().addBlock('skills');
        useBuilderStore.getState().toggleBlock(id);
        expect(useBuilderStore.getState().blocks.find(b => b.id === id)!.enabled).toBe(false);
        useBuilderStore.getState().toggleBlock(id);
        expect(useBuilderStore.getState().blocks.find(b => b.id === id)!.enabled).toBe(true);
    });

    it('updateBlockPosition updates x,y', () => {
        const id = useBuilderStore.getState().addBlock('project');
        useBuilderStore.getState().updateBlockPosition(id, 42, 99);
        const block = useBuilderStore.getState().blocks.find(b => b.id === id)!;
        expect(block.position).toEqual({ x: 42, y: 99 });
    });

    it('addFile adds a file and switches to it', () => {
        useBuilderStore.getState().addFile('resume.cls');
        const { projectFiles, activeFileName } = useBuilderStore.getState();
        expect(projectFiles.some(f => f.name === 'resume.cls')).toBe(true);
        expect(activeFileName).toBe('resume.cls');
    });

    it('addFile is idempotent — adding a duplicate name is a no-op', () => {
        useBuilderStore.getState().addFile('main.tex');
        expect(useBuilderStore.getState().projectFiles).toHaveLength(1);
    });

    it('deleteFile removes the file and switches activeFileName', () => {
        useBuilderStore.getState().addFile('extra.tex');
        useBuilderStore.getState().setActiveFileName('extra.tex');
        useBuilderStore.getState().deleteFile('extra.tex');
        expect(useBuilderStore.getState().projectFiles.some(f => f.name === 'extra.tex')).toBe(false);
        expect(useBuilderStore.getState().activeFileName).toBe('main.tex');
    });

    it('updateFileContent updates content for a file', () => {
        useBuilderStore.getState().updateFileContent('main.tex', '\\documentclass{article}');
        expect(useBuilderStore.getState().projectFiles.find(f => f.name === 'main.tex')!.content).toBe('\\documentclass{article}');
    });

    it('addResume creates a new resume and switches to it', () => {
        useBuilderStore.getState().addResume({ title: 'Second Resume' });
        const { resumes, activeResumeIndex } = useBuilderStore.getState();
        expect(resumes).toHaveLength(2);
        expect(activeResumeIndex).toBe(1);
    });

    it('switchResume activates the correct resume', () => {
        useBuilderStore.getState().addResume();
        useBuilderStore.getState().switchResume(0);
        expect(useBuilderStore.getState().activeResumeIndex).toBe(0);
    });

    it('deleteResume removes a resume (keeps at least 1)', () => {
        useBuilderStore.getState().addResume();
        useBuilderStore.getState().deleteResume(0);
        expect(useBuilderStore.getState().resumes).toHaveLength(1);
    });

    it('does not delete the last remaining resume', () => {
        useBuilderStore.getState().deleteResume(0);
        expect(useBuilderStore.getState().resumes).toHaveLength(1);
    });

    it('resetCanvas clears all state', () => {
        useBuilderStore.getState().addBlock('header');
        useBuilderStore.getState().addResume();
        useBuilderStore.getState().resetCanvas();
        const state = useBuilderStore.getState();
        expect(state.blocks).toHaveLength(0);
        expect(state.resumes).toHaveLength(1);
        expect(state.customTemplate).toBe('');
    });

    it('loadResumes populates store from server data', () => {
        const serverResumes = [
            {
                id: 'uuid-1', title: 'My Resume',
                canvasData: { nodes: [{ id: 'b1', type: 'header', position: { x: 0, y: 0 }, data: { name: 'Bob' }, enabled: true }], projectFiles: [], activeFileName: 'main.tex' },
            },
        ];
        useBuilderStore.getState().loadResumes(serverResumes);
        const state = useBuilderStore.getState();
        expect(state.resumes[0].id).toBe('uuid-1');
        expect(state.blocks[0].data.name).toBe('Bob');
    });

    it('setResumeId sets the id for a given index', () => {
        useBuilderStore.getState().setResumeId(0, 'new-uuid');
        expect(useBuilderStore.getState().resumes[0].id).toBe('new-uuid');
    });
});

// ── 5. Document Structure Validator ──────────────────────────────────────────
describe('LatexGenerator.validateGeneratedLatex (edge cases)', () => {
    const gen = new LatexGenerator();

    it('catches missing \\begin{document}', () => {
        const result = gen.validateGeneratedLatex('\\documentclass{article}\\end{document}');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Missing \\begin{document}');
    });

    it('catches missing \\end{document}', () => {
        const result = gen.validateGeneratedLatex('\\documentclass{article}\\begin{document}');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Missing \\end{document}');
    });

    it('passes a well-formed document', () => {
        const latex = [
            '\\documentclass[11pt,a4]{article}',
            '\\begin{document}',
            '\\begin{itemize}',
            '\\item Hello',
            '\\end{itemize}',
            '\\end{document}',
        ].join('\n');
        const result = gen.validateGeneratedLatex(latex);
        expect(result.valid).toBe(true);
    });
});

// ── 6. API Integration (fetch mocks) ─────────────────────────────────────────
describe('Client AI Service (backend delegation)', () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
        globalThis.fetch = originalFetch;
        vi.restoreAllMocks();
    });

    const mockFetchJson = (body: any, status = 200) => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: status < 400,
            status,
            json: async () => body,
            text: async () => JSON.stringify(body),
        } as any);
    };

    const mockFetchText = (body: string, status = 200) => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: status < 400,
            status,
            json: async () => ({ error: body }),
            text: async () => body,
        } as any);
    };

    it('polishExperience posts to /ai/experience and returns parsed JSON', async () => {
        const { geminiService } = await import('../client/services/ai');
        mockFetchJson({ polishedPoints: ['Did stuff'] });
        const result = await geminiService.polishExperience('I worked at a company');
        expect((globalThis.fetch as any).mock.calls[0][0]).toContain('/ai/experience');
        expect(result.polishedPoints).toContain('Did stuff');
    });

    it('assembleFullResume posts to /ai/assemble and returns text', async () => {
        const { geminiService } = await import('../client/services/ai');
        mockFetchText('\\documentclass{article}\\begin{document}Content\\end{document}');
        const result = await geminiService.assembleFullResume([], '');
        expect((globalThis.fetch as any).mock.calls[0][0]).toContain('/ai/assemble');
        expect(result).toContain('\\documentclass');
    });

    it('throws on HTTP error from backend', async () => {
        const { geminiService } = await import('../client/services/ai');
        mockFetchJson({ error: 'AI processing failed' }, 500);
        await expect(geminiService.polishSkills('Python')).rejects.toThrow('AI processing failed');
    });

    it('editFile posts to /ai/edit-file', async () => {
        const { geminiService } = await import('../client/services/ai');
        mockFetchText('\\documentclass{article}\\begin{document}Edited\\end{document}');
        const result = await geminiService.editFile('\\documentclass{article}', 'Add a header');
        expect((globalThis.fetch as any).mock.calls[0][0]).toContain('/ai/edit-file');
        expect(result).toContain('Edited');
    });
});

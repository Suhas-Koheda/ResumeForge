import { describe, it, expect } from 'vitest';
import { latexGenerator } from '../latexGenerator';
import { ResumeBlock } from '../../../shared/types';
import { LatexGenerationOptions } from '../../../shared/template.types';

describe('LatexGenerator', () => {
  const mockOptions: LatexGenerationOptions = {
    template: 'modern',
    fontSize: 11,
    paperSize: 'a4',
    colorScheme: { primary: '#000000', secondary: '#555555', accent: '#cccccc' },
    fontFamily: 'sans',
    showIcons: true,
    sectionStyle: 'lined'
  };

  it('should escape special latex characters', () => {
    expect(latexGenerator.escapeLatex('Hello & World')).toBe('Hello \\& World');
    expect(latexGenerator.escapeLatex('100%')).toBe('100\\%');
  });

  it('should generate a preamble with correct font size', () => {
    const preamble = latexGenerator.generatePreamble(mockOptions);
    expect(preamble).toContain('11pt');
  });

  it('should generate a full resume', () => {
    const blocks: ResumeBlock[] = [
      {
        id: '1',
        type: 'experience',
        position: { x: 0, y: 0 },
        enabled: true,
        data: {
          items: [{ position: 'Developer', company: 'Google', period: '2023', description: ['Coding'] }]
        }
      }
    ];
    const content = latexGenerator.generateFullResume(blocks, mockOptions);
    expect(content).toContain('Developer');
    expect(content).toContain('Google');
    expect(content).toContain('\\sectiontitle{Experience}');
  });
});

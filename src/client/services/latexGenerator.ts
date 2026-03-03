import { ResumeBlock } from "../../shared/types";
import { 
  LatexGenerationOptions, 
  ExperienceData, 
  EducationData, 
  ProjectData, 
  SkillsData, 
  ValidationResult 
} from "../../shared/template.types";

export class LatexGenerator {
  generateFullResume(blocks: ResumeBlock[], options: LatexGenerationOptions): string {
    const preamble = this.generatePreamble(options);
    
    // Group blocks by type
    const headerBlock = blocks.find(b => b.type === 'header' && (b.enabled !== false));
    const summaryBlock = blocks.find(b => b.type === 'summary' && (b.enabled !== false));
    const experienceBlocks = blocks.filter(b => b.type === 'experience' && (b.enabled !== false));
    const educationBlocks = blocks.filter(b => b.type === 'education' && (b.enabled !== false));
    const projectBlocks = blocks.filter(b => b.type === 'project' && (b.enabled !== false));
    const skillsBlock = blocks.find(b => b.type === 'skills' && (b.enabled !== false));

    let content = '\\begin{document}\n';
    
    if (headerBlock) {
      content += this.generateHeader(headerBlock.data, options);
    }

    if (summaryBlock && summaryBlock.data.content) {
      content += this.generateSection('Summary', this.escapeLatex(summaryBlock.data.content), options);
    }

    if (experienceBlocks.length > 0) {
      const expContent = experienceBlocks.map(b => {
        if (b.data.items && Array.isArray(b.data.items)) {
          return b.data.items.map((item: any) => this.generateExperienceBlock(item, options)).join('\n');
        }
        return this.generateExperienceBlock(b.data as ExperienceData, options);
      }).join('\n');
      content += this.generateSection('Experience', expContent, options);
    }

    if (educationBlocks.length > 0) {
      const eduContent = educationBlocks.map(b => {
        if (b.data.items && Array.isArray(b.data.items)) {
          return b.data.items.map((item: any) => this.generateEducationBlock(item, options)).join('\n');
        }
        return this.generateEducationBlock(b.data as EducationData, options);
      }).join('\n');
      content += this.generateSection('Education', eduContent, options);
    }

    if (projectBlocks.length > 0) {
      const projContent = projectBlocks.map(b => {
        if (b.data.items && Array.isArray(b.data.items)) {
          return b.data.items.map((item: any) => this.generateProjectBlock(item, options)).join('\n');
        }
        return this.generateProjectBlock(b.data as ProjectData, options);
      }).join('\n');
      content += this.generateSection('Projects', projContent, options);
    }

    if (skillsBlock) {
      content += this.generateSection('Skills', this.generateSkillsBlock(skillsBlock.data as SkillsData, options), options);
    }

    content += '\\end{document}';

    return this.formatLatex(content);
  }

  generatePreamble(options: LatexGenerationOptions): string {
    if (options.template === 'custom' && options.customPreamble) {
      return options.customPreamble;
    }

    const { fontSize, paperSize, colorScheme, fontFamily } = options;
    
    let fontPkg = '';
    if (fontFamily === 'sans') fontPkg = '\\usepackage[sfdefault]{roboto}';
    else if (fontFamily === 'serif') fontPkg = '\\usepackage{charter}';
    else if (fontFamily === 'mono') fontPkg = '\\usepackage{sourcecodepro}';

    return `
\\documentclass[${fontSize}pt, ${paperSize}]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{geometry}
\\geometry{margin=1in}
\\usepackage{xcolor}
\\usepackage{hyperref}
\\usepackage{enumitem}
\\usepackage{fontawesome5}
${fontPkg}

\\definecolor{primaryColor}{HTML}{${colorScheme.primary.replace('#', '')}}
\\definecolor{secondaryColor}{HTML}{${colorScheme.secondary.replace('#', '')}}
\\definecolor{accentColor}{HTML}{${colorScheme.accent.replace('#', '')}}

\\hypersetup{
    colorlinks=true,
    linkcolor=primaryColor,
    filecolor=primaryColor,      
    urlcolor=primaryColor,
}

\\newcommand{\\sectiontitle}[1]{
    \\vspace{10pt}
    {\\Large\\bfseries\\color{primaryColor} #1}
    ${options.sectionStyle === 'lined' ? '\\vfill\\hrule' : ''}
    \\vspace{5pt}
}

\\pagestyle{empty}
`;
  }

  generateHeader(headerData: any, options: LatexGenerationOptions): string {
    const { name, title, email, phone, location, linkedin, github, website } = headerData;
    
    let contactInfo = [];
    if (email) contactInfo.push(`\\href{mailto:${this.escapeLatex(email, 'url')}}{${this.escapeLatex(email)}}`);
    if (phone) contactInfo.push(this.escapeLatex(phone));
    if (location) contactInfo.push(this.escapeLatex(location));
    
    let socialInfo = [];
    if (linkedin) socialInfo.push(`\\href{${this.escapeLatex(linkedin, 'url')}}{LinkedIn}`);
    if (github) socialInfo.push(`\\href{${this.escapeLatex(github, 'url')}}{GitHub}`);
    if (website) socialInfo.push(`\\href{${this.escapeLatex(website, 'url')}}{Portfolio}`);

    return `
\\begin{center}
    {\\Huge\\bfseries\\color{primaryColor} ${this.escapeLatex(name || '')}} \\\\
    \\vspace{5pt}
    {\\large ${this.escapeLatex(title || '')}} \\\\
    \\vspace{5pt}
    ${contactInfo.join(' | ')} \\\\
    ${socialInfo.join(' | ')}
\\end{center}
`;
  }

  generateSection(title: string, content: string, options: LatexGenerationOptions): string {
    return `
\\sectiontitle{${this.escapeLatex(title)}}
${content}
`;
  }

  generateExperienceBlock(exp: ExperienceData, options: LatexGenerationOptions): string {
    const bullets = exp.description?.map(bullet => `\\item ${this.escapeLatex(bullet)}`).join('\n') || '';
    return `
\\noindent
\\textbf{${this.escapeLatex(exp.position)}} \\hfill ${this.escapeLatex(exp.period)} \\\\
\\textit{${this.escapeLatex(exp.company)}} \\hfill \\textit{${this.escapeLatex(exp.location)}}
\\begin{itemize}[noitemsep, topsep=0pt, partopsep=0pt, parsep=0pt]
    ${bullets}
\\end{itemize}
\\vspace{5pt}
`;
  }

  generateEducationBlock(edu: EducationData, options: LatexGenerationOptions): string {
    const bullets = edu.description?.map(bullet => `\\item ${this.escapeLatex(bullet)}`).join('\n') || '';
    return `
\\noindent
\\textbf{${this.escapeLatex(edu.degree)}} \\hfill ${this.escapeLatex(edu.period)} \\\\
\\textit{${this.escapeLatex(edu.school)}} \\hfill \\textit{${this.escapeLatex(edu.location)}}
${bullets ? `\\begin{itemize}[noitemsep, topsep=0pt, partopsep=0pt, parsep=0pt]\n${bullets}\n\\end{itemize}` : ''}
\\vspace{5pt}
`;
  }

  generateProjectBlock(proj: ProjectData, options: LatexGenerationOptions): string {
    const bullets = proj.description?.map(bullet => `\\item ${this.escapeLatex(bullet)}`).join('\n') || '';
    const tech = proj.technologies?.length > 0 ? `\\\\ \\textit{Technologies: ${this.escapeLatex(proj.technologies.join(', '))}}` : '';
    return `
\\noindent
\\textbf{${this.escapeLatex(proj.name)}} ${proj.link ? `(\\href{${this.escapeLatex(proj.link, 'url')}}{Link})` : ''} \\hfill ${this.escapeLatex(proj.period)} ${tech}
\\begin{itemize}[noitemsep, topsep=0pt, partopsep=0pt, parsep=0pt]
    ${bullets}
\\end{itemize}
\\vspace{5pt}
`;
  }

  generateSkillsBlock(skills: SkillsData, options: LatexGenerationOptions): string {
    if (!skills.categories) return '';
    return skills.categories.map(cat => {
      return `\\noindent \\textbf{${this.escapeLatex(cat.name)}:} ${this.escapeLatex(cat.items.join(', '))}`;
    }).join(' \\\\ \n');
  }

  escapeLatex(text: string, mode: 'text' | 'url' | 'math' = 'text'): string {
    if (!text) return '';
    
    if (mode === 'url') {
      return text.replace(/%/g, '\\%').replace(/#/g, '\\#');
    }

    // Basic LaTeX escaping
    let escaped = text
      .replace(/\\/g, '\\textbackslash ')
      .replace(/&/g, '\\&')
      .replace(/%/g, '\\%')
      .replace(/\$/g, '\\$')
      .replace(/#/g, '\\#')
      .replace(/_/g, '\\_')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/\~/g, '\\textasciitilde ')
      .replace(/\^/g, '\\textasciicircum ');

    // Cleanup common AI hallucinations/artifacts from icon misidentification
    // e.g., lone ']', 'ć', 'ç', 'a' as text instead of icons
    if (escaped.length <= 1 && /^[\]ćçab]$/i.test(escaped)) {
        return '';
    }

    return escaped;
  }

  validateGeneratedLatex(latex: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!latex.includes('\\documentclass')) errors.push('Missing \\documentclass');
    if (!latex.includes('\\begin{document}')) errors.push('Missing \\begin{document}');
    if (!latex.includes('\\end{document}')) errors.push('Missing \\end{document}');

    // Count balanced environments
    const environments = ['document', 'itemize', 'enumerate', 'center'];
    environments.forEach(env => {
      const beginCount = (latex.match(new RegExp(`\\\\begin\\{${env}\\}`, 'g')) || []).length;
      const endCount = (latex.match(new RegExp(`\\\\end\\{${env}\\}`, 'g')) || []).length;
      if (beginCount !== endCount) {
        errors.push(`Unbalanced ${env} environment: ${beginCount} begin, ${endCount} end`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  minifyLatex(latex: string): string {
    return latex
      .split('\n')
      .map(line => line.split('%')[0].trim()) // Remove comments and trim
      .filter(line => line.length > 0)
      .join('\n');
  }

  formatLatex(latex: string): string {
    // Simple formatter - in a real app this might use a library
    return latex.trim();
  }
}

export const latexGenerator = new LatexGenerator();

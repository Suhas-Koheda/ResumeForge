import { BlockType } from './types.js';

export interface ParsedResume {
  header: {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };
  blocks: Array<{
    id: string;
    type: BlockType;
    data: any;
  }>;
}

export class RobustLatexParser {
  public async parse(latex: string): Promise<{ blocks: any[] }> {
    const resume = this.parseInternal(latex);
    
    const extractedBlocks: any[] = [];
    
    extractedBlocks.push({
      id: Math.random().toString(36).substring(7),
      type: 'header',
      data: resume.header,
    });
    
    resume.blocks.forEach(b => {
      extractedBlocks.push({
        id: b.id,
        type: b.type,
        data: b.data
      });
    });

    return { blocks: extractedBlocks };
  }

  private unescapeLatex(str: string): string {
    if (!str) return '';
    return str
      .replace(/\\&/g, '&').replace(/\\%/g, '%').replace(/\\\$/g, '$')
      .replace(/\\#/g, '#').replace(/\\_/g, '_').replace(/\\\{/g, '{')
      .replace(/\\\}/g, '}').replace(/\\textbf\{([^}]+)\}/g, '$1')
      .replace(/\\textit\{([^}]+)\}/g, '$1').replace(/\\emph\{([^}]+)\}/g, '$1')
      .replace(/\\noindent\s*/g, '').replace(/\\huge\s*/gi, '').replace(/\\Large\s*/gi, '')
      .replace(/\\scshape\s*/g, '').replace(/\\bfseries\s*/g, '')
      .replace(/\\href\{([^}]+)\}\{([^}]+)\}/g, '$2')
      .trim();
  }

  public parseInternal(latex: string): ParsedResume {
    const resume: ParsedResume = {
      header: { name: '', email: '', phone: '', location: '', linkedin: '', github: '', website: '' },
      blocks: []
    };

    // Strip comments
    const cleaned = latex.replace(/(?<!\\)%.*/g, '');

    // Extract basic fields
    const nameMatch = cleaned.match(/\\name\{([^}]+)\}/) || 
                      cleaned.match(/\{\\huge\s+(?:\\textbf\{)?([^}\n]+)\}?/i) ||
                      cleaned.match(/\\Huge\s+(?:\\textbf\{)?([^}\n]+)\}?/i) ||
                      cleaned.match(/\\begin\{center\}\s*[\s\S]*?(?:\{\\huge |\\[Hh]uge )\\?textbf\{([^}]+)\}/);
    if (nameMatch) resume.header.name = this.unescapeLatex(nameMatch[1]);

    const emailMatch = cleaned.match(/\\email\{([^}]+)\}/) || 
                       cleaned.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) resume.header.email = this.unescapeLatex(emailMatch[1] || emailMatch[0]);

    const phoneMatch = cleaned.match(/\\phone\{([^}]+)\}/) || 
                       cleaned.match(/(\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
    if (phoneMatch) resume.header.phone = this.unescapeLatex(phoneMatch[1] || phoneMatch[0]);

    const preContent = cleaned.split(/\\section/)[0] || '';
    const locMatch = preContent.match(/(?:San Francisco|New York|London|Hyderabad|Bangalore|Pune|Seattle)[-,\sA-Za-z]*/i) ||
                     preContent.match(/([A-Z][a-zA-Z\s]+,\s*[A-Z]{2,3})/);
    if (locMatch && !locMatch[0].includes('@')) resume.header.location = this.unescapeLatex(locMatch[0]).trim();

    const inMatch = cleaned.match(/linkedin\.com\/in\/([a-zA-Z0-9-]+)/);
    if (inMatch) resume.header.linkedin = `https://linkedin.com/in/${inMatch[1]}`;

    const gitMatch = cleaned.match(/github\.com\/([a-zA-Z0-9-]+)/);
    if (gitMatch) resume.header.github = `https://github.com/${gitMatch[1]}`;


    // Sections
    const sectionRegex = /\\section(?:\*)?\{([^}]+)\}/g;
    let match;
    const sections: { title: string, content: string }[] = [];
    let lastIndex = 0;
    let lastTitle = '';

    while ((match = sectionRegex.exec(cleaned)) !== null) {
      if (lastTitle) {
        sections.push({ title: lastTitle, content: cleaned.substring(lastIndex, match.index) });
      }
      lastTitle = match[1];
      lastIndex = match.index + match[0].length;
    }
    if (lastTitle) {
      sections.push({ title: lastTitle, content: cleaned.substring(lastIndex) });
    }

    for (const sec of sections) {
      const t = sec.title.toLowerCase();
      if (t.includes('experience') || t.includes('employment')) {
        this.parseExperience(sec.content, resume.blocks);
      } else if (t.includes('education') || t.includes('academic')) {
        this.parseEducation(sec.content, resume.blocks);
      } else if (t.includes('skill')) {
        this.parseSkills(sec.content, resume.blocks);
      }
    }

    return resume;
  }

  private parseExperience(content: string, blocks: any[]) {
      // Split experience content by either \noindent, \customSubHeading, \company, or empty lines between groups
      // Actually finding company-role blocks is easier if we look for bold texts and then capture till next bold text
      
      const commands = [...content.matchAll(/\\(customSubHeading|company|textbf)\s*\{([^}]+)\}/g)];
      
      if (commands.length === 0) {
        // Fallback for plain text parsing
        return;
      }

      // Instead of manual splitting, let's just find \textbf{...} and assume it's a company, 
      // \textit{...} is role.
      // Or if there are specific macros like \company{} \role{} \dates{}
      const parts = content.split(/(?=\\company|\\textbf\{|\\customSubHeading|\\noindent)/);
      for (const p of parts) {
        if (p.trim().length < 5) continue;

        let company = '';
        let role = '';
        let duration = '';
        let location = '';
        const highlights: string[] = [];

        const compMatch = p.match(/\\company\{([^}]+)\}/) || p.match(/\\textbf\{([^}]+)\}/);
        if (compMatch) company = compMatch[1];
        
        const roleMatch = p.match(/\\role\{([^}]+)\}/) || p.match(/\\textit\{([^}]+)\}/);
        if (roleMatch) role = roleMatch[1];

        const dateMatch = p.match(/\\dates\{([^}]+)\}/) || p.match(/([12][0-9]{3}\s*[-–]\s*(?:Present|[12][0-9]{3}))/i) || p.match(/([A-Z][a-z]+\s*\d{4}\s*[-–]\s*(?:Present|[A-Z][a-z]+\s*\d{4}))/i);
        if (dateMatch) duration = dateMatch[1];

        const locMatch = p.match(/\\location\{([^}]+)\}/) || p.match(/\\hfill\s+([A-Z][a-zA-Z\s]+,\s*[A-Z]{2,3})/);
        if (locMatch) location = locMatch[1];

        // Bullets
        const bullets = [...p.matchAll(/\\item\s+(.*?)(?=\\item|\\end\{itemize\}|$)/gs)].map(m => this.unescapeLatex(m[1].replace(/\\customItem\{|\}/g, '').trim()));
        const customBullets = [...p.matchAll(/\\customItem\{([^}]+)\}/g)].map(m => this.unescapeLatex(m[1]));

        if (bullets.length > 0) highlights.push(...bullets);
        if (customBullets.length > 0) highlights.push(...customBullets);

        if (company || role || highlights.length > 0) {
           blocks.push({
             id: Math.random().toString(36).substring(7),
             type: 'experience',
             data: {
               company: this.unescapeLatex(company),
               role: this.unescapeLatex(role),
               duration: this.unescapeLatex(duration),
               location: this.unescapeLatex(location),
               highlights
             }
           });
        }
      }
  }

  private parseEducation(content: string, blocks: any[]) {
      const parts = content.split(/(?=\\school|\\textbf\{|\\customSubHeading|\\noindent)/);
      for (const p of parts) {
        if (p.trim().length < 5) continue;
        const compMatch = p.match(/\\school\{([^}]+)\}/) || p.match(/\\textbf\{([^}]+)\}/);
        const roleMatch = p.match(/\\degree\{([^}]+)\}/) || p.match(/\\textit\{([^}]+)\}/);
        const dateMatch = p.match(/\\year\{([^}]+)\}/) || p.match(/([12][0-9]{3})/i);
        
        blocks.push({
           id: Math.random().toString(36).substring(7),
           type: 'education',
           data: {
              school: this.unescapeLatex(compMatch ? compMatch[1] : ''),
              degree: this.unescapeLatex(roleMatch ? roleMatch[1] : ''),
              year: this.unescapeLatex(dateMatch ? dateMatch[1] : ''),
              location: ''
           }
        });
      }
  }

  private parseSkills(content: string, blocks: any[]) {
      const items = [...content.matchAll(/\\item(?:\[.*?\])?\s*\\textbf\{([^}]+)\}:?\s*([^\n]+)/g)];
      items.forEach(m => {
          blocks.push({
             id: Math.random().toString(36).substring(7),
             type: 'skills',
             data: {
                category: this.unescapeLatex(m[1]).trim(),
                skills: this.unescapeLatex(m[2]).trim()
             }
          });
      });
  }
}

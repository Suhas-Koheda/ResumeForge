import { ResumeBlock, BlockType } from '@shared/types';

export const offlineLatexParser = {
    parseLatexBlocks(latex: string): Partial<ResumeBlock>[] {
        const blocks: Partial<ResumeBlock>[] = [];
        
        // Clean latex comments
        const cleaned = latex.replace(/(?<!\\)%.*/g, '');

        const header: any = {
            name: '', email: '', phone: '', location: '', linkedin: '', github: '', website: ''
        };

        const nameMatch = cleaned.match(/\\name\{([^}]+)\}/) || 
                          cleaned.match(/\{\\huge\s+(?:\\textbf\{)?([^}\n]+)\}?/i) ||
                          cleaned.match(/\\Huge\s+(?:\\textbf\{)?([^}\n]+)\}?/i) ||
                          cleaned.match(/\\begin\{center\}\s*[\s\S]*?(?:\{\\huge |\\[Hh]uge )\\?textbf\{([^}]+)\}/);
        if (nameMatch) header.name = this.unescapeLatex(nameMatch[1]);

        const emailMatch = cleaned.match(/\\email\{([^}]+)\}/) || 
                           cleaned.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) header.email = this.unescapeLatex(emailMatch[1] || emailMatch[0]);

        const phoneMatch = cleaned.match(/\\phone\{([^}]+)\}/) || 
                           cleaned.match(/(\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
        if (phoneMatch) header.phone = this.unescapeLatex(phoneMatch[1] || phoneMatch[0]);

        const preContent = cleaned.split(/\\section/)[0] || '';
        const locMatch = preContent.match(/(?:San Francisco|New York|London|Hyderabad|Bangalore|Pune|Seattle)[-,\sA-Za-z]*/i) ||
                         preContent.match(/([A-Z][a-zA-Z\s]+,\s*[A-Z]{2,3})/);
        if (locMatch && !locMatch[0].includes('@')) header.location = this.unescapeLatex(locMatch[0]).trim();

        const inMatch = cleaned.match(/linkedin\.com\/in\/([a-zA-Z0-9-]+)/);
        if (inMatch) header.linkedin = `https://linkedin.com/in/${inMatch[1]}`;

        const gitMatch = cleaned.match(/github\.com\/([a-zA-Z0-9-]+)/);
        if (gitMatch) header.github = `https://github.com/${gitMatch[1]}`;

        blocks.push({
           type: 'header',
           data: header
        });

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
               const parts = sec.content.split(/(?=\\company|\\textbf\{|\\customSubHeading|\\noindent)/);
               for (const p of parts) {
                  if (p.trim().length < 5) continue;
                  let company = '', role = '', duration = '', location = '';
                  const highlights: string[] = [];

                  const compMatch = p.match(/\\company\{([^}]+)\}/) || p.match(/\\textbf\{([^}]+)\}/);
                  if (compMatch) company = compMatch[1];
                  
                  const roleMatch = p.match(/\\role\{([^}]+)\}/) || p.match(/\\textit\{([^}]+)\}/);
                  if (roleMatch) role = roleMatch[1];

                  const dateMatch = p.match(/\\dates\{([^}]+)\}/) || p.match(/([12][0-9]{3}\s*[-–]\s*(?:Present|[12][0-9]{3}))/i) || p.match(/([A-Z][a-z]+\s*\d{4}\s*[-–]\s*(?:Present|[A-Z][a-z]+\s*\d{4}))/i);
                  if (dateMatch) duration = dateMatch[1];

                  const locMatch = p.match(/\\location\{([^}]+)\}/) || p.match(/\\hfill\s+([A-Z][a-zA-Z\s]+,\s*[A-Z]{2,3})/);
                  if (locMatch) location = locMatch[1];

                  const bullets = [...p.matchAll(/\\item\s+(.*?)(?=\\item|\\end\{itemize\}|$)/gs)].map(m => this.unescapeLatex(m[1].replace(/\\customItem\{|\}/g, '').trim()));
                  const customBullets = [...p.matchAll(/\\customItem\{([^}]+)\}/g)].map(m => this.unescapeLatex(m[1]));

                  if (bullets.length > 0) highlights.push(...bullets);
                  if (customBullets.length > 0) highlights.push(...customBullets);

                  if (company || role || highlights.length > 0) {
                     blocks.push({
                        type: 'experience',
                        data: {
                           company: this.unescapeLatex(company), role: this.unescapeLatex(role),
                           duration: this.unescapeLatex(duration), location: this.unescapeLatex(location),
                           highlights
                        }
                     });
                  }
               }
           } else if (t.includes('education') || t.includes('academic')) {
               const parts = sec.content.split(/(?=\\school|\\textbf\{|\\customSubHeading|\\noindent)/);
               for (const p of parts) {
                  if (p.trim().length < 5) continue;
                  const compMatch = p.match(/\\school\{([^}]+)\}/) || p.match(/\\textbf\{([^}]+)\}/);
                  const roleMatch = p.match(/\\degree\{([^}]+)\}/) || p.match(/\\textit\{([^}]+)\}/);
                  const dateMatch = p.match(/\\year\{([^}]+)\}/) || p.match(/([12][0-9]{3})/i);
                  blocks.push({
                     type: 'education',
                     data: {
                        school: this.unescapeLatex(compMatch ? compMatch[1] : ''),
                        degree: this.unescapeLatex(roleMatch ? roleMatch[1] : ''),
                        year: this.unescapeLatex(dateMatch ? dateMatch[1] : ''),
                        location: ''
                     }
                  });
               }
           } else if (t.includes('skill')) {
               const items = [...sec.content.matchAll(/\\item(?:\[.*?\])?\s*\\textbf\{([^}]+)\}:?\s*([^\n]+)/g)];
               items.forEach(m => {
                   blocks.push({
                      type: 'skills',
                      data: {
                         category: this.unescapeLatex(m[1]).trim(),
                         skills: this.unescapeLatex(m[2]).trim()
                      }
                   });
               });
           } else if (t.includes('summary')) {
               blocks.push({
                  type: 'summary',
                  data: { summary: this.unescapeLatex(sec.content).trim() }
               });
           }
        }

        return blocks;
    },

    unescapeLatex(text: string): string {
        if (!text) return '';
        return text
            .replace(/\\&/g, '&').replace(/\\%/g, '%').replace(/\\\$/g, '$')
            .replace(/\\#/g, '#').replace(/\\_/g, '_').replace(/\\\{/g, '{')
            .replace(/\\\}/g, '}').replace(/\\textbf\{([^}]+)\}/g, '$1')
            .replace(/\\textit\{([^}]+)\}/g, '$1').replace(/\\emph\{([^}]+)\}/g, '$1')
            .replace(/\\noindent\s*/g, '').replace(/\\huge\s*/gi, '').replace(/\\Large\s*/gi, '')
            .replace(/\\scshape\s*/g, '').replace(/\\bfseries\s*/g, '')
            .replace(/\\href\{([^}]+)\}\{([^}]+)\}/g, '$2')
            .trim();
    }
};

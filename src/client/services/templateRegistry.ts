import { TemplateType, LatexGenerationOptions } from "../../shared/template.types";

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  type: TemplateType;
  config: Partial<LatexGenerationOptions>;
}

class TemplateRegistry {
  private templates: Map<string, TemplateDefinition> = new Map();

  constructor() {
    this.registerBuiltInTemplates();
  }

  private registerBuiltInTemplates() {
    const builtIn: TemplateDefinition[] = [
      {
        id: 'modern',
        name: 'Modern',
        description: 'A clean, modern professional template with roboto fonts.',
        thumbnail: '/templates/modern.png',
        type: 'modern',
        config: {
          fontSize: 11,
          paperSize: 'a4',
          colorScheme: {
            primary: '#2563eb',
            secondary: '#4b5563',
            accent: '#3b82f6'
          },
          fontFamily: 'sans',
          showIcons: true,
          sectionStyle: 'lined'
        }
      },
      {
        id: 'classic',
        name: 'Classic',
        description: 'Traditional academic/serif style for formal applications.',
        thumbnail: '/templates/classic.png',
        type: 'classic',
        config: {
          fontSize: 10,
          paperSize: 'letter',
          colorScheme: {
            primary: '#000000',
            secondary: '#333333',
            accent: '#666666'
          },
          fontFamily: 'serif',
          showIcons: false,
          sectionStyle: 'spaced'
        }
      },
      {
        id: 'technical',
        name: 'Technical',
        description: 'Focused on clarity and technical skills, compact layout.',
        thumbnail: '/templates/technical.png',
        type: 'technical',
        config: {
          fontSize: 10,
          paperSize: 'a4',
          colorScheme: {
            primary: '#0f172a',
            secondary: '#334155',
            accent: '#0ea5e9'
          },
          fontFamily: 'sans',
          showIcons: true,
          sectionStyle: 'compact'
        }
      },
      {
        id: 'creative',
        name: 'Creative',
        description: 'Dynamic layout with accent colors for creative roles.',
        thumbnail: '/templates/creative.png',
        type: 'creative',
        config: {
          fontSize: 12,
          paperSize: 'a4',
          colorScheme: {
            primary: '#7c3aed',
            secondary: '#1f2937',
            accent: '#c084fc'
          },
          fontFamily: 'sans',
          showIcons: true,
          sectionStyle: 'decorative'
        }
      }
    ];

    builtIn.forEach(t => this.templates.set(t.id, t));
  }

  getTemplate(id: string): TemplateDefinition | undefined {
    return this.templates.get(id);
  }

  getAllTemplates(): TemplateDefinition[] {
    return Array.from(this.templates.values());
  }

  registerCustomTemplate(template: TemplateDefinition) {
    this.templates.set(template.id, template);
  }
}

export const templateRegistry = new TemplateRegistry();

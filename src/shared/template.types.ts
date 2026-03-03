import { ResumeBlock } from "./types";

export type TemplateType = 'modern' | 'classic' | 'technical' | 'creative' | 'custom';

export interface LatexGenerationOptions {
  template: TemplateType;
  customPreamble?: string;
  fontSize: 10 | 11 | 12;
  paperSize: 'letter' | 'a4';
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
  };
  fontFamily: 'sans' | 'serif' | 'mono' | 'custom';
  showIcons: boolean;
  sectionStyle: 'lined' | 'spaced' | 'compact' | 'decorative';
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ExperienceData {
  company: string;
  position: string;
  location: string;
  period: string;
  description: string[];
}

export interface EducationData {
  school: string;
  degree: string;
  location: string;
  period: string;
  description: string[];
}

export interface ProjectData {
  name: string;
  technologies: string[];
  period: string;
  description: string[];
  link?: string;
}

export interface SkillsData {
  categories: {
    name: string;
    items: string[];
  }[];
}

export interface InternalResumeData {
    header: any;
    summary?: string;
    experience: ExperienceData[];
    education: EducationData[];
    projects: ProjectData[];
    skills: SkillsData;
}

export type BlockType = 'experience' | 'education' | 'skills' | 'project' | 'header';

export interface ResumeBlock {
  id: string;
  type: BlockType;
  position: { x: number; y: number }; // 2D coordinates
  data: Record<string, any>;
}

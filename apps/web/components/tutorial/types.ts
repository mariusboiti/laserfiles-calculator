// Tutorial system types for LaserFilesPro Studio

export interface TutorialStep {
  title: string;
  content: string;
}

export interface TutorialSection {
  id: string;
  title: string;
  icon?: string;
  content?: string;
  steps?: TutorialStep[];
  tips?: string[];
  videoUrl?: string;
  videoType?: 'youtube' | 'mp4';
  imageUrl?: string;
  imageAlt?: string;
}

export interface TutorialData {
  toolSlug: string;
  title: string;
  description: string;
  estimatedTime?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  sections: TutorialSection[];
}

// Standard section IDs for consistency
export const SECTION_IDS = {
  OVERVIEW: 'overview',
  STEP_BY_STEP: 'step-by-step',
  BEST_PRACTICES: 'best-practices',
  TROUBLESHOOTING: 'troubleshooting',
  VIDEO: 'video',
} as const;

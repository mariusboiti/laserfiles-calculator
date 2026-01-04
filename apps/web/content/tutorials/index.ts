// Tutorial registry - lazy load tutorial content per tool
import type { TutorialData } from '@/components/tutorial/types';

type TutorialLoader = () => Promise<{ default: TutorialData }>;

const tutorialLoaders: Record<string, TutorialLoader> = {
  'boxmaker': () => import('./boxmaker'),
  'engraveprep': () => import('./engraveprep'),
  'panel-splitter': () => import('./panel-splitter'),
  'bulk-name-tags': () => import('./bulk-name-tags'),
  'price-calculator': () => import('./price-calculator'),
  'personalised-sign-generator': () => import('./personalised-sign-generator'),
  'keychain-generator': () => import('./keychain-generator'),
  'round-coaster-generator': () => import('./round-coaster-generator'),
  'jigsaw-maker': () => import('./jigsaw-maker'),
  'ornament-layout-planner': () => import('./ornament-layout-planner'),
  'jig-fixture-generator': () => import('./jig-fixture-generator'),
  'inlay-offset-calculator': () => import('./inlay-offset-calculator'),
  'ai-depth-photo': () => import('./ai-depth-photo'),
  'curved-photo-frame-v3': () => import('./curved-photo-frame-v3'),
  'product-label-generator': () => import('./product-label-generator'),
};

export function hasTutorial(toolSlug: string): boolean {
  return toolSlug in tutorialLoaders;
}

export async function loadTutorial(toolSlug: string): Promise<TutorialData | null> {
  const loader = tutorialLoaders[toolSlug];
  if (!loader) return null;
  
  try {
    const module = await loader();
    return module.default;
  } catch (error) {
    console.error(`Failed to load tutorial for ${toolSlug}:`, error);
    return null;
  }
}

export function getTutorialSlugs(): string[] {
  return Object.keys(tutorialLoaders);
}

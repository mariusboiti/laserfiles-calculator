// Tutorial registry - lazy load tutorial content per tool
import type { TutorialData } from '@/components/tutorial/types';

type TutorialLoader = () => Promise<{ default: TutorialData }>;

type LocalizedTutorialLoaders = Record<string, Record<string, TutorialLoader>>;

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

const localizedTutorialLoaders: LocalizedTutorialLoaders = {
  'product-label-generator': {
    ro: () => import('./product-label-generator.ro'),
    es: () => import('./product-label-generator.es'),
    fr: () => import('./product-label-generator.fr'),
    de: () => import('./product-label-generator.de'),
  },
};

function normalizeLocale(locale?: string): string | null {
  const l = String(locale || '').trim().toLowerCase();
  if (!l) return null;
  return l.split('-')[0] || null;
}

export function hasTutorial(toolSlug: string): boolean {
  return toolSlug in tutorialLoaders;
}

export async function loadTutorial(toolSlug: string, locale?: string): Promise<TutorialData | null> {
  const normalizedLocale = normalizeLocale(locale);
  const localizedLoader = normalizedLocale ? localizedTutorialLoaders[toolSlug]?.[normalizedLocale] : undefined;
  const loader = localizedLoader || tutorialLoaders[toolSlug];
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

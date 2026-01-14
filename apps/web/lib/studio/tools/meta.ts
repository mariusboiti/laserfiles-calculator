export type StudioToolStatus = 'stable';

export type StudioToolMeta = {
  slug: string;
  titleKey: string;
  descriptionKey: string;
  proFeatures?: string[];
  status: StudioToolStatus;
  usesAI?: boolean;
};

export const studioToolMetas: StudioToolMeta[] = [
  {
    slug: 'engraveprep',
    titleKey: 'tools.engraveprep.title',
    descriptionKey: 'tools.engraveprep.description',
    proFeatures: ['batch export', 'advanced dithering presets'],
  },
  {
    slug: 'boxmaker',
    titleKey: 'tools.boxmaker.title',
    descriptionKey: 'tools.boxmaker.description',
    proFeatures: ['lid', 'hinges', 'batch export'],
    usesAI: true,
  },
  {
    slug: 'panel-splitter',
    titleKey: 'tools.panel-splitter.title',
    descriptionKey: 'tools.panel-splitter.description',
    proFeatures: ['unlimited tiles', 'zip export presets'],
  },
  {
    slug: 'bulk-name-tags',
    titleKey: 'tools.bulk-name-tags.title',
    descriptionKey: 'tools.bulk-name-tags.description',
    proFeatures: ['CSV upload', 'Unlimited rows', 'ZIP export', 'Font packs'],
    usesAI: true,
  },
  {
    slug: 'product-label-generator',
    titleKey: 'tools.product-label-generator.title',
    descriptionKey: 'tools.product-label-generator.description',
    proFeatures: ['Batch labels', 'CSV import', 'Custom layouts'],
  },
  {
    slug: 'round-coaster-generator',
    titleKey: 'tools.round-coaster-generator.title',
    descriptionKey: 'tools.round-coaster-generator.description',
    proFeatures: ['Canvas editor', 'Undo/redo', 'Advanced shapes', 'Layer colors', 'Batch export'],
    usesAI: true,
  },
  {
    slug: 'ornament-layout-planner',
    titleKey: 'tools.ornament-layout-planner.title',
    descriptionKey: 'tools.ornament-layout-planner.description',
    proFeatures: ['Auto nesting', 'Multiple templates', 'Mixed sizes'],
  },
  {
    slug: 'inlay-offset-calculator',
    titleKey: 'tools.inlay-offset-calculator.title',
    descriptionKey: 'tools.inlay-offset-calculator.description',
    proFeatures: ['Import SVG + real offset', 'Batch shapes', 'Material presets'],
  },
  {
    slug: 'jig-fixture-generator',
    titleKey: 'tools.jig-fixture-generator.title',
    descriptionKey: 'tools.jig-fixture-generator.description',
    proFeatures: ['Multiple object types', 'Mixed layouts', 'Auto nesting'],
  },
  {
    slug: 'personalised-sign-generator',
    titleKey: 'tools.personalised-sign-generator.title',
    descriptionKey: 'tools.personalised-sign-generator.description',
    proFeatures: ['Layer system', 'Text modes', 'AI Sketch/Silhouette', 'Outline offset', 'Shared fonts'],
    usesAI: true,
  },
  {
    slug: 'keychain-generator',
    titleKey: 'tools.keychain-generator.title',
    descriptionKey: 'tools.keychain-generator.description',
    proFeatures: ['Text to paths', '80+ icons', '2-layer export', 'Script & Sans fonts', 'Custom icons'],
    usesAI: true,
  },
  {
    slug: 'curved-photo-frame-v3',
    titleKey: 'tools.curved-photo-frame-v3.title',
    descriptionKey: 'tools.curved-photo-frame-v3.description',
    proFeatures: ['Auto Kerf', 'Edge Safety', 'Assembly Guide (PDF)', 'Batch mode'],
  },
  {
    slug: 'ai-depth-photo',
    titleKey: 'tools.ai-depth-photo.title',
    descriptionKey: 'tools.ai-depth-photo.description',
    proFeatures: ['AI Generation', 'Height Maps', 'Material Profiles', 'Depth Zones', 'Histogram Validation'],
    usesAI: true,
  },
  {
    slug: 'jigsaw-maker',
    titleKey: 'tools.jigsaw-maker.title',
    descriptionKey: 'tools.jigsaw-maker.description',
    proFeatures: ['Photo Mode', 'Kids Mode', 'Custom Knob Styles', 'Kerf Offset', 'Batch Export'],
    usesAI: true,
  },
  {
    slug: 'price-calculator',
    titleKey: 'tools.price-calculator.title',
    descriptionKey: 'tools.price-calculator.description',
    proFeatures: ['Material Database', 'Time Estimates', 'Profit Margins', 'Order Management', 'Customer Database'],
  },
].map((t) => ({
  ...t,
  status: 'stable' as const,
}));

export function getStudioToolMetaBySlug(slug: string) {
  return studioToolMetas.find((t) => t.slug === slug);
}

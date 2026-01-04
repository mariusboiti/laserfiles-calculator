export type StudioToolStatus = 'stable';

export type StudioToolMeta = {
  slug: string;
  title: string;
  description: string;
  proFeatures?: string[];
  status: StudioToolStatus;
  usesAI?: boolean;
};

export const studioToolMetas: StudioToolMeta[] = [
  {
    slug: 'engraveprep',
    title: 'EngravePrep',
    description: 'Prepare photos for laser engraving with contrast and dithering adjustments.',
    proFeatures: ['batch export', 'advanced dithering presets'],
  },
  {
    slug: 'boxmaker',
    title: 'BoxMaker',
    description: 'Design finger-joint boxes with custom dimensions and export laser-ready files.',
    proFeatures: ['lid', 'hinges', 'batch export'],
    usesAI: true,
  },
  {
    slug: 'panel-splitter',
    title: 'Panel Splitter',
    description: 'Split large designs into tiles that fit your laser bed size.',
    proFeatures: ['unlimited tiles', 'zip export presets'],
  },
  {
    slug: 'bulk-name-tags',
    title: 'Bulk Name Tags',
    description: 'Create personalized name tags in bulk from a spreadsheet.',
    proFeatures: ['CSV upload', 'Unlimited rows', 'ZIP export', 'Font packs'],
    usesAI: true,
  },
  {
    slug: 'product-label-generator',
    title: 'Product Labels',
    description: 'Design product labels with SKU codes and QR codes for laser engraving.',
    proFeatures: ['Batch labels', 'CSV import', 'Custom layouts'],
  },
  {
    slug: 'round-coaster-generator',
    title: 'Coaster Designer',
    description: 'Design custom coasters and badges with cut and engrave layers.',
    proFeatures: ['Canvas editor', 'Undo/redo', 'Advanced shapes', 'Layer colors', 'Batch export'],
    usesAI: true,
  },
  {
    slug: 'ornament-layout-planner',
    title: 'Ornament Layout Planner',
    description: 'Arrange ornaments and nameplates efficiently on your material sheet.',
    proFeatures: ['Auto nesting', 'Multiple templates', 'Mixed sizes'],
  },
  {
    slug: 'inlay-offset-calculator',
    title: 'Inlay Calculator',
    description: 'Calculate precise offsets for perfect-fit inlays and pockets.',
    proFeatures: ['Import SVG + real offset', 'Batch shapes', 'Material presets'],
  },
  {
    slug: 'jig-fixture-generator',
    title: 'Jig & Fixture Generator',
    description: 'Create alignment jigs for repeatable positioning on your laser.',
    proFeatures: ['Multiple object types', 'Mixed layouts', 'Auto nesting'],
  },
  {
    slug: 'personalised-sign-generator',
    title: 'Sign Designer',
    description: 'Design personalized signs with 130+ fonts, shapes, and AI-assisted graphics.',
    proFeatures: ['Layer system', 'Text modes', 'AI Sketch/Silhouette', 'Outline offset', 'Shared fonts'],
    usesAI: true,
  },
  {
    slug: 'keychain-generator',
    title: 'Keychain Designer',
    description: 'Create custom keychains with text, icons, and multiple style options.',
    proFeatures: ['Text to paths', '80+ icons', '2-layer export', 'Script & Sans fonts', 'Custom icons'],
    usesAI: true,
  },
  {
    slug: 'curved-photo-frame-v3',
    title: 'Curved Frame Generator',
    description: 'Design living-hinge curved frames with automatic kerf calculation.',
    proFeatures: ['Auto Kerf', 'Edge Safety', 'Assembly Guide (PDF)', 'Batch mode'],
  },
  {
    slug: 'ai-depth-photo',
    title: 'Depth Engraving',
    description: 'Generate height maps from photos for 3D-effect laser engraving.',
    proFeatures: ['AI Generation', 'Height Maps', 'Material Profiles', 'Depth Zones', 'Histogram Validation'],
    usesAI: true,
  },
  {
    slug: 'jigsaw-maker',
    title: 'Jigsaw Puzzle Maker',
    description: 'Turn any image into a laser-cuttable jigsaw puzzle.',
    proFeatures: ['Photo Mode', 'Kids Mode', 'Custom Knob Styles', 'Kerf Offset', 'Batch Export'],
    usesAI: true,
  },
  {
    slug: 'price-calculator',
    title: 'Price Calculator',
    description: 'Calculate job pricing with material costs, time, and profit margins.',
    proFeatures: ['Material Database', 'Time Estimates', 'Profit Margins', 'Order Management', 'Customer Database'],
  },
  {
    slug: 'multilayer-maker',
    title: 'MultiLayer Maker',
    description: 'Convert images into layered vector files for multi-material cuts.',
    usesAI: true,
  },
].map((t) => ({
  ...t,
  status: 'stable' as const,
}));

export function getStudioToolMetaBySlug(slug: string) {
  return studioToolMetas.find((t) => t.slug === slug);
}

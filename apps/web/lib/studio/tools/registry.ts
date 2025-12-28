import { EngravePrepTool } from '@/lib/tools/engraveprep/ui/EngravePrepTool';
import { BoxMakerTool } from '@/lib/tools/boxmaker/ui/BoxMakerTool';
import { PanelSplitterTool } from '@/lib/tools/panel-splitter/ui/PanelSplitterTool';
import { BulkNameTagsTool } from '@/lib/tools/bulk-name-tags/ui/BulkNameTagsTool';
import { ProductLabelTool } from '@/lib/tools/product-label-generator/ui/ProductLabelTool';
import { RoundCoasterToolV2 } from '@/lib/tools/round-coaster-badge-generator/ui/RoundCoasterToolV2';
import { OrnamentLayoutTool } from '@/lib/tools/ornament-layout-planner/ui/OrnamentLayoutTool';
import { InlayOffsetTool } from '@/lib/tools/inlay-offset-calculator/ui/InlayOffsetTool';
import { JigFixtureTool } from '@/lib/tools/jig-fixture-generator/ui/JigFixtureTool';
import PersonalisedSignToolPro from '@/lib/tools/personalised-sign-generator/ui/PersonalisedSignToolPro';
import KeychainToolV2 from '@/lib/tools/keychain/ui/KeychainToolV2';
import { CurvedPhotoFrameGeneratorTool } from '@/lib/tools/curved-photo-frame-generator/ui/CurvedPhotoFrameGeneratorTool';
import { CurvedPhotoFrameV2Tool } from '@/lib/tools/curved-photo-frame-generator-v2/ui/CurvedPhotoFrameV2Tool';
import { CurvedPhotoFrameV3Tool } from '@/lib/tools/curved-photo-frame-generator-v3/ui/CurvedPhotoFrameV3Tool';
import { AIDepthEngravingTool } from '@/lib/tools/ai-depth-photo/ui/AIDepthEngravingTool';
import { JigsawMakerTool } from '@/lib/tools/jigsaw-maker/ui/JigsawMakerTool';
import type { StudioTool } from './types';

// MultiLayerMaker uses wizard directly in page.tsx, no separate tool component needed
const MultiLayerMakerPlaceholder = () => null;

export const studioTools: StudioTool[] = [
  {
    slug: 'engraveprep',
    title: 'EngravePrep',
    description: 'Prepare photos for laser engraving with contrast + dithering.',
    proFeatures: ['batch export', 'advanced dithering presets'],
    Component: EngravePrepTool,
  },
  {
    slug: 'boxmaker',
    title: 'BoxMaker',
    description: 'Generate laser-ready finger-joint boxes as SVG.',
    proFeatures: ['lid', 'hinges', 'batch export'],
    Component: BoxMakerTool,
  },
  {
    slug: 'panel-splitter',
    title: 'Panel Splitter',
    description: 'Split a large SVG into tiles sized for your laser bed.',
    proFeatures: ['unlimited tiles', 'zip export presets'],
    Component: PanelSplitterTool,
  },
  {
    slug: 'bulk-name-tags',
    title: 'Bulk Name Tag Generator',
    description: 'Generate laser-ready name tags in bulk from CSV and export SVG or ZIP.',
    proFeatures: ['CSV upload', 'Unlimited rows', 'ZIP export', 'Font packs'],
    Component: BulkNameTagsTool,
  },
  {
    slug: 'product-label-generator',
    title: 'Product Label & SKU Generator',
    description: 'Create laser-ready product labels with SKU and QR codes.',
    proFeatures: ['Batch labels', 'CSV import', 'Custom layouts'],
    Component: ProductLabelTool,
  },
  {
    slug: 'round-coaster-generator',
    title: 'Round Coaster & Badge Generator V2',
    description: 'Create laser-ready coasters and badges with CUT/ENGRAVE layers, auto text-fit, and production controls.',
    proFeatures: ['Curved text', 'Batch export', 'Advanced shapes', 'Holes', 'Layer colors'],
    Component: RoundCoasterToolV2,
  },
  {
    slug: 'ornament-layout-planner',
    title: 'Ornament & Nameplate Layout Planner',
    description: 'Arrange multiple ornaments or nameplates on a material sheet for laser cutting.',
    proFeatures: ['Auto nesting', 'Multiple templates', 'Mixed sizes'],
    Component: OrnamentLayoutTool,
  },
  {
    slug: 'inlay-offset-calculator',
    title: 'Inlay Offset Calculator',
    description: 'Calculate kerf-based offsets for inlay and pocket parts and export demo SVGs.',
    proFeatures: ['Import SVG + real offset', 'Batch shapes', 'Material presets'],
    Component: InlayOffsetTool,
  },
  {
    slug: 'jig-fixture-generator',
    title: 'Jig & Fixture Generator',
    description: 'Generate laser-ready jigs and fixtures for repeatable engraving and cutting.',
    proFeatures: ['Multiple object types', 'Mixed layouts', 'Auto nesting'],
    Component: JigFixtureTool,
  },
  {
    slug: 'personalised-sign-generator',
    title: 'Personalised Sign Generator V3 PRO',
    description: 'Layer-based sign designer with text-to-path, AI generation, cut/engrave modes, and 130+ fonts.',
    proFeatures: ['Layer system', 'Text modes', 'AI Sketch/Silhouette', 'Outline offset', 'Shared fonts'],
    Component: PersonalisedSignToolPro,
  },
  {
    slug: 'keychain-generator',
    title: 'Keychain Hub PRO',
    description: 'Create laser-ready keychains with text as real paths (no <text>), 80+ icons, and multiple styles.',
    proFeatures: ['Text to paths', '80+ icons', '2-layer export', 'Script & Sans fonts', 'Custom icons'],
    Component: KeychainToolV2,
  },
  {
    slug: 'curved-photo-frame-v3',
    title: 'Curved Photo Frame Generator',
    description: 'Next-gen curved frame generator with bend radius + auto kerf + assembly guide.',
    proFeatures: ['Auto Kerf', 'Edge Safety', 'Assembly Guide (PDF)', 'Batch mode'],
    Component: CurvedPhotoFrameV3Tool,
  },
  {
    slug: 'ai-depth-photo',
    title: 'AI Depth Engraving Tool',
    description: 'Professional laser engraving height map generator with material profiles and depth control.',
    proFeatures: ['AI Generation', 'Height Maps', 'Material Profiles', 'Depth Zones', 'Histogram Validation'],
    Component: AIDepthEngravingTool,
  },
  {
    slug: 'jigsaw-maker',
    title: 'Jigsaw Maker',
    description: 'Generate laser-safe SVG jigsaw puzzles with customizable piece shapes.',
    proFeatures: ['Photo Mode', 'Kids Mode', 'Custom Knob Styles', 'Kerf Offset', 'Batch Export'],
    Component: JigsawMakerTool,
  },
];

export function getToolBySlug(slug: string) {
  return studioTools.find((t) => t.slug === slug);
}

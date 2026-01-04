import { EngravePrepTool } from '@/lib/tools/engraveprep/ui/EngravePrepTool';
import { BoxMakerTool } from '@/lib/tools/boxmaker/ui/BoxMakerTool';
import { PanelSplitterTool } from '@/lib/tools/panel-splitter/ui/PanelSplitterTool';
import { BulkNameTagsTool } from '@/lib/tools/bulk-name-tags/ui/BulkNameTagsTool';
import { ProductLabelTool } from '@/lib/tools/product-label-generator/ui/ProductLabelTool';
import { RoundCoasterToolPro } from '@/lib/tools/round-coaster-badge-generator/ui/RoundCoasterToolPro';
import { OrnamentLayoutTool } from '@/lib/tools/ornament-layout-planner/ui/OrnamentLayoutTool';
import { InlayOffsetTool } from '@/lib/tools/inlay-offset-calculator/ui/InlayOffsetTool';
import { JigFixtureTool } from '@/lib/tools/jig-fixture-generator/ui/JigFixtureTool';
import PersonalisedSignToolPro from '@/lib/tools/personalised-sign-generator/ui/PersonalisedSignToolPro';
import KeychainToolV2 from '@/lib/tools/keychain/ui/KeychainToolV2';
import { CurvedPhotoFrameV3Tool } from '@/lib/tools/curved-photo-frame-generator-v3/ui/CurvedPhotoFrameV3Tool';
import { AIDepthEngravingTool } from '@/lib/tools/ai-depth-photo/ui/AIDepthEngravingTool';
import { JigsawMakerTool } from '@/lib/tools/jigsaw-maker/ui/JigsawMakerTool';
import type { StudioTool } from './types';
import { studioToolMetas } from './meta';

// MultiLayerMaker uses wizard directly in page.tsx, no separate tool component needed
// const MultiLayerMakerPlaceholder = () => null;

// PriceCalculator has its own app routing, placeholder for registry
const PriceCalculatorPlaceholder = () => null;

const componentBySlug: Record<string, StudioTool['Component']> = {
  engraveprep: EngravePrepTool,
  boxmaker: BoxMakerTool,
  'panel-splitter': PanelSplitterTool,
  'bulk-name-tags': BulkNameTagsTool,
  'product-label-generator': ProductLabelTool,
  'round-coaster-generator': RoundCoasterToolPro,
  'ornament-layout-planner': OrnamentLayoutTool,
  'inlay-offset-calculator': InlayOffsetTool,
  'jig-fixture-generator': JigFixtureTool,
  'personalised-sign-generator': PersonalisedSignToolPro,
  'keychain-generator': KeychainToolV2,
  'curved-photo-frame-v3': CurvedPhotoFrameV3Tool,
  'ai-depth-photo': AIDepthEngravingTool,
  'jigsaw-maker': JigsawMakerTool,
  // 'multilayer-maker': MultiLayerMakerPlaceholder,
  'price-calculator': PriceCalculatorPlaceholder,
};

export const studioTools: StudioTool[] = studioToolMetas.map((meta) => {
  const Component = componentBySlug[meta.slug] || (() => null);
  return {
    ...meta,
    Component,
  };
});

export function getToolBySlug(slug: string) {
  return studioTools.find((t) => t.slug === slug);
}

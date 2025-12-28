export type ToolStatus = 'v1' | 'soon';

export interface Tool {
  key: string;
  name: string;
  versionLabel: string;
  status: ToolStatus;
  href: string;
  description: string;
}

export const toolsRegistry: Tool[] = [
  // Active (v1) Tools
  {
    key: 'price-calculator',
    name: 'Price Calculator',
    versionLabel: 'v1',
    status: 'v1',
    href: '/studio/tools/price-calculator',
    description: 'Calculate accurate pricing for laser cutting projects with material costs and margins',
  },
  {
    key: 'engraveprep',
    name: 'EngravePrep',
    versionLabel: 'v1',
    status: 'v1',
    href: '/studio/tools/engraveprep',
    description: 'Prepare and optimize designs for laser engraving with automatic settings',
  },
  {
    key: 'box-maker',
    name: 'Box Maker',
    versionLabel: 'v1',
    status: 'v1',
    href: '/studio/tools/box-maker',
    description: 'Generate custom box designs with finger joints and precise dimensions',
  },
  {
    key: 'panel-splitter',
    name: 'Panel Splitter',
    versionLabel: 'v1',
    status: 'v1',
    href: '/studio/tools/panel-splitter',
    description: 'Split large designs into smaller panels for efficient material usage',
  },
  {
    key: 'bulk-name-tag',
    name: 'Bulk Name Tag Generator',
    versionLabel: 'v1',
    status: 'v1',
    href: '/studio/tools/bulk-name-tag',
    description: 'Create multiple personalized name tags from a list in batch',
  },

  // Soon Tools
  {
    key: 'multilayer-maker',
    name: 'MultiLayer Maker',
    versionLabel: 'Soon',
    status: 'soon',
    href: '/studio/tools/multilayer-maker',
    description: 'Design multi-layered projects with automatic alignment and spacing',
  },
  {
    key: 'product-label-generator',
    name: 'Product Label Generator',
    versionLabel: 'Soon',
    status: 'soon',
    href: '/studio/tools/product-label-generator',
    description: 'Generate professional product labels with QR codes and branding',
  },
  {
    key: 'round-coaster-generator',
    name: 'Round Coaster Generator',
    versionLabel: 'Soon',
    status: 'soon',
    href: '/studio/tools/round-coaster-generator',
    description: 'Create circular coaster designs with custom patterns and text',
  },
  {
    key: 'ornament-layout-planner',
    name: 'Ornament Layout Planner',
    versionLabel: 'Soon',
    status: 'soon',
    href: '/studio/tools/ornament-layout-planner',
    description: 'Plan optimal layouts for ornament production and material efficiency',
  },
  {
    key: 'inlay-offset-calculator',
    name: 'Inlay Offset Calculator',
    versionLabel: 'Soon',
    status: 'soon',
    href: '/studio/tools/inlay-offset-calculator',
    description: 'Calculate precise offsets for perfect inlay fits and tolerances',
  },
  {
    key: 'jig-fixture-generator',
    name: 'Jig & Fixture Generator',
    versionLabel: 'Soon',
    status: 'soon',
    href: '/studio/tools/jig-fixture-generator',
    description: 'Design custom jigs and fixtures for repeatable cutting operations',
  },
  {
    key: 'hinge-creator',
    name: 'Hinge Creator',
    versionLabel: 'Soon',
    status: 'soon',
    href: '/studio/tools/hinge-creator',
    description: 'Generate living hinges and flexible joint patterns for your projects',
  },
];

export function getToolsByStatus(status: ToolStatus): Tool[] {
  return toolsRegistry.filter((tool) => tool.status === status);
}

export function getToolByKey(key: string): Tool | undefined {
  return toolsRegistry.find((tool) => tool.key === key);
}

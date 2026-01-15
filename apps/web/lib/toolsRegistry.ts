export type ToolStatus = 'stable';

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
    versionLabel: '',
    status: 'stable',
    href: '/studio/tools/price-calculator',
    description: 'Calculate accurate pricing for laser cutting projects with material costs and margins',
  },
  {
    key: 'engraveprep',
    name: 'EngravePrep',
    versionLabel: '',
    status: 'stable',
    href: '/studio/tools/engraveprep',
    description: 'Prepare and optimize designs for laser engraving with automatic settings',
  },
  {
    key: 'box-maker',
    name: 'Box Maker',
    versionLabel: '',
    status: 'stable',
    href: '/studio/tools/box-maker',
    description: 'Generate custom box designs with finger joints and precise dimensions',
  },
  {
    key: 'panel-splitter',
    name: 'Panel Splitter',
    versionLabel: '',
    status: 'stable',
    href: '/studio/tools/panel-splitter',
    description: 'Split large designs into smaller panels for efficient material usage',
  },
  {
    key: 'bulk-name-tag',
    name: 'Bulk Name Tag Generator',
    versionLabel: '',
    status: 'stable',
    href: '/studio/tools/bulk-name-tags',
    description: 'Create multiple personalized name tags from a list in batch',
  },

  // Soon Tools
  {
    key: 'product-label-generator',
    name: 'Product Label Generator',
    versionLabel: '',
    status: 'stable',
    href: '/studio/tools/product-label-generator',
    description: 'Generate professional product labels with QR codes and branding',
  },
  {
    key: 'round-coaster-generator',
    name: 'Round Coaster Generator',
    versionLabel: '',
    status: 'stable',
    href: '/studio/tools/round-coaster-generator',
    description: 'Create circular coaster designs with custom patterns and text',
  },
  {
    key: 'ornament-layout-planner',
    name: 'Ornament Layout Planner',
    versionLabel: '',
    status: 'stable',
    href: '/studio/tools/ornament-layout-planner',
    description: 'Plan optimal layouts for ornament production and material efficiency',
  },
  {
    key: 'inlay-offset-calculator',
    name: 'Inlay Offset Calculator',
    versionLabel: '',
    status: 'stable',
    href: '/studio/tools/inlay-offset-calculator',
    description: 'Calculate precise offsets for perfect inlay fits and tolerances',
  },
  {
    key: 'jig-fixture-generator',
    name: 'Jig & Fixture Generator',
    versionLabel: '',
    status: 'stable',
    href: '/studio/tools/jig-fixture-generator',
    description: 'Design custom jigs and fixtures for repeatable cutting operations',
  },
  {
    key: 'hinge-creator',
    name: 'Hinge Creator',
    versionLabel: '',
    status: 'stable',
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

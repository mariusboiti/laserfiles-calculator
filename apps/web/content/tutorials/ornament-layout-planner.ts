import type { TutorialData } from '@/components/tutorial/types';
import { SECTION_IDS } from '@/components/tutorial/types';

const tutorial: TutorialData = {
  toolSlug: 'ornament-layout-planner',
  title: 'Ornament Layout Planner Tutorial',
  description: 'Efficiently arrange multiple ornaments on material sheets for optimized laser cutting.',
  estimatedTime: '4-6 min',
  difficulty: 'beginner',
  sections: [
    {
      id: SECTION_IDS.OVERVIEW,
      title: 'What is Ornament Layout Planner?',
      content: `The Ornament Layout Planner helps you maximize material usage by arranging multiple pieces. Features:

• Multiple ornament templates
• Mixed size support
• Auto-nesting algorithms
• Material sheet configuration
• Quantity management
• Efficient SVG export

Perfect for holiday ornaments, gift tags, nameplates, and batch production.`,
    },
    {
      id: SECTION_IDS.STEP_BY_STEP,
      title: 'Step-by-Step Guide',
      steps: [
        {
          title: 'Set Material Sheet Size',
          content: 'Enter your material dimensions (e.g., 600x400mm for a typical plywood sheet).',
        },
        {
          title: 'Choose Ornament Template',
          content: 'Select from built-in shapes or upload custom SVG designs.',
        },
        {
          title: 'Set Quantities',
          content: 'Enter how many of each ornament you need to cut.',
        },
        {
          title: 'Configure Spacing',
          content: 'Set minimum gap between pieces (3-5mm recommended for clean cuts).',
        },
        {
          title: 'Auto-Arrange',
          content: 'Click arrange to optimize layout. Manual adjustments available.',
        },
        {
          title: 'Export Layout',
          content: 'Download the complete sheet layout as SVG for your laser.',
        },
      ],
    },
    {
      id: SECTION_IDS.BEST_PRACTICES,
      title: 'Best Practices',
      tips: [
        'Group same-sized items together for efficient nesting',
        'Leave 5-10mm margin from sheet edges',
        'Consider grain direction for wood materials',
        'Start with larger items, then fill gaps with smaller ones',
        'Save layouts for reuse with future orders',
        'Account for kerf when calculating spacing',
      ],
    },
    {
      id: SECTION_IDS.TROUBLESHOOTING,
      title: 'Troubleshooting',
      tips: [
        'Items not fitting? Reduce quantities or increase sheet size',
        'Too much waste? Try different arrangement or mix sizes',
        'Overlapping pieces? Increase minimum spacing',
        'Export incorrect? Verify sheet dimensions match your material',
      ],
    },
  ],
};

export default tutorial;

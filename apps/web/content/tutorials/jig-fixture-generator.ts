import type { TutorialData } from '@/components/tutorial/types';
import { SECTION_IDS } from '@/components/tutorial/types';

const tutorial: TutorialData = {
  toolSlug: 'jig-fixture-generator',
  title: 'Jig & Fixture Generator Tutorial',
  description: 'Create precision jigs and fixtures for repeatable laser cutting and engraving.',
  estimatedTime: '5-7 min',
  difficulty: 'intermediate',
  sections: [
    {
      id: SECTION_IDS.OVERVIEW,
      title: 'What is Jig & Fixture Generator?',
      content: `The Jig & Fixture Generator creates positioning aids for repeatable work. Features:

• Multiple object shape support
• Nested pocket generation
• Registration mark options
• Material thickness compensation
• Mixed layout capability
• Auto-nesting for multiple items

Perfect for production runs, consistent positioning, and quality control.`,
    },
    {
      id: SECTION_IDS.STEP_BY_STEP,
      title: 'Step-by-Step Guide',
      steps: [
        {
          title: 'Define Object Shape',
          content: 'Enter the dimensions of the item you need to position (or import its SVG outline).',
        },
        {
          title: 'Set Jig Material',
          content: 'Choose jig material thickness (typically thicker than the workpiece).',
        },
        {
          title: 'Configure Pocket Depth',
          content: 'Set how deep the workpiece sits in the jig. Usually matches workpiece thickness.',
        },
        {
          title: 'Add Registration Features',
          content: 'Include alignment marks, corner stops, or edge guides as needed.',
        },
        {
          title: 'Generate Layout',
          content: 'For multiple items, auto-nest or manually position pockets.',
        },
        {
          title: 'Export Jig Design',
          content: 'Download SVG with cut lines for the jig and any engrave guidelines.',
        },
      ],
    },
    {
      id: SECTION_IDS.BEST_PRACTICES,
      title: 'Best Practices',
      tips: [
        'Use MDF or acrylic for jigs - they stay flat and are easy to cut',
        'Make jigs slightly larger than needed for easy item placement',
        'Add corner chamfers to guide items into position',
        'Include origin marks that align with your laser software',
        'Label jigs with project name/date for future reference',
        'Test fit with actual items before production run',
      ],
    },
    {
      id: SECTION_IDS.TROUBLESHOOTING,
      title: 'Troubleshooting',
      tips: [
        'Items not fitting? Check kerf compensation and add tolerance',
        'Items moving during work? Add retaining features or deeper pockets',
        'Registration off? Verify jig is squared to laser bed',
        'Inconsistent results? Check jig for warping and replace if needed',
      ],
    },
  ],
};

export default tutorial;

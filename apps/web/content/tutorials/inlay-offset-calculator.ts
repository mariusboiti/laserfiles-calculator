import type { TutorialData } from '@/components/tutorial/types';
import { SECTION_IDS } from '@/components/tutorial/types';

const tutorial: TutorialData = {
  toolSlug: 'inlay-offset-calculator',
  title: 'Inlay Offset Calculator Tutorial',
  description: 'Calculate precise kerf-based offsets for perfect inlay and pocket fits.',
  estimatedTime: '4-6 min',
  difficulty: 'advanced',
  sections: [
    {
      id: SECTION_IDS.OVERVIEW,
      title: 'What is Inlay Offset Calculator?',
      content: `The Inlay Offset Calculator helps create perfectly fitting inlay pieces by compensating for laser kerf. Features:

• Automatic kerf compensation
• Pocket and inlay piece generation
• Material preset library
• Visual fit preview
• SVG import support
• Batch shape processing

Essential for marquetry, decorative inlays, and precision-fit components.`,
    },
    {
      id: SECTION_IDS.STEP_BY_STEP,
      title: 'Step-by-Step Guide',
      steps: [
        {
          title: 'Measure Your Kerf',
          content: 'Cut a test line and measure the gap. Typical kerf is 0.1-0.3mm depending on material.',
        },
        {
          title: 'Import or Draw Shape',
          content: 'Upload an SVG or use built-in shapes for your inlay design.',
        },
        {
          title: 'Enter Kerf Value',
          content: 'Input your measured kerf width. This determines the offset amount.',
        },
        {
          title: 'Choose Fit Type',
          content: 'Select tight fit, standard, or loose fit based on your application.',
        },
        {
          title: 'Generate Offset Paths',
          content: 'Tool creates pocket path (outset) and inlay path (inset).',
        },
        {
          title: 'Export Both Pieces',
          content: 'Download SVGs for pocket and inlay. Cut from appropriate materials.',
        },
      ],
    },
    {
      id: SECTION_IDS.BEST_PRACTICES,
      title: 'Best Practices',
      tips: [
        'Always measure kerf on the actual material you\'ll use',
        'Kerf varies with power, speed, and material thickness',
        'For glued inlays, use slightly loose fit for adhesive room',
        'For friction-fit, use tight setting and sand if needed',
        'Test with scrap before cutting final pieces',
        'Keep kerf measurements documented per material',
      ],
    },
    {
      id: SECTION_IDS.TROUBLESHOOTING,
      title: 'Troubleshooting',
      tips: [
        'Inlay too loose? Decrease kerf value or choose tighter fit',
        'Inlay won\'t fit? Increase kerf value or sand edges',
        'Inconsistent fit? Kerf may vary across material - check consistency',
        'Complex shapes failing? Simplify design or check for self-intersecting paths',
      ],
    },
  ],
};

export default tutorial;

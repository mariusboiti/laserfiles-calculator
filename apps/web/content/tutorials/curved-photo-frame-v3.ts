import type { TutorialData } from '@/components/tutorial/types';
import { SECTION_IDS } from '@/components/tutorial/types';

const tutorial: TutorialData = {
  toolSlug: 'curved-photo-frame-v3',
  title: 'Curved Photo Frame Generator Tutorial',
  description: 'Create living hinge curved frames with auto-kerf and assembly guides.',
  estimatedTime: '5-8 min',
  difficulty: 'intermediate',
  sections: [
    {
      id: SECTION_IDS.OVERVIEW,
      title: 'What is Curved Photo Frame Generator?',
      content: `The Curved Photo Frame Generator creates bendable frames using living hinge patterns. Features:

• Automatic bend radius calculation
• Living hinge pattern generation
• Kerf compensation for bending
• Edge safety margins
• Assembly guide generation (PDF)
• Multiple frame styles

Perfect for unique photo displays, curved signage, and flexible enclosures.`,
    },
    {
      id: SECTION_IDS.STEP_BY_STEP,
      title: 'Step-by-Step Guide',
      steps: [
        {
          title: 'Set Photo Size',
          content: 'Enter the dimensions of the photo or artwork to be displayed.',
        },
        {
          title: 'Choose Curve Radius',
          content: 'Define how tight the curve should be. Tighter = more hinge cuts needed.',
        },
        {
          title: 'Select Hinge Pattern',
          content: 'Pick from wave, straight, or custom patterns. Each has different flex properties.',
        },
        {
          title: 'Configure Material',
          content: 'Set thickness (typically 3-4mm). Thicker needs wider hinge cuts.',
        },
        {
          title: 'Apply Auto-Kerf',
          content: 'Enable kerf compensation for accurate final dimensions after cutting.',
        },
        {
          title: 'Export + Assembly Guide',
          content: 'Download SVG for cutting and PDF assembly instructions.',
        },
      ],
    },
    {
      id: SECTION_IDS.BEST_PRACTICES,
      title: 'Best Practices',
      tips: [
        'Use flexible plywood (poplar or birch) for best bending',
        'Test bend radius on scrap before final cut',
        'Soak wood briefly for tighter curves without cracking',
        'Hinge cuts should go across the grain for flexibility',
        'Leave extra material on ends for mounting points',
        'Sand hinge areas lightly to prevent splinters',
      ],
    },
    {
      id: SECTION_IDS.TROUBLESHOOTING,
      title: 'Troubleshooting',
      tips: [
        'Wood cracking? Use thinner material or larger bend radius',
        'Not bending enough? Add more hinge cuts or soak material',
        'Hinges breaking? Reduce laser power to avoid weakening wood',
        'Frame too stiff? Try different hinge pattern or spacing',
      ],
    },
  ],
};

export default tutorial;

import type { TutorialData } from '@/components/tutorial/types';
import { SECTION_IDS } from '@/components/tutorial/types';

const tutorial: TutorialData = {
  toolSlug: 'round-coaster-generator',
  title: 'Round Coaster & Badge Generator Tutorial',
  description: 'Design circular coasters and badges with a full-featured canvas editor.',
  estimatedTime: '5-7 min',
  difficulty: 'intermediate',
  sections: [
    {
      id: SECTION_IDS.OVERVIEW,
      title: 'What is Round Coaster Generator?',
      content: `The Round Coaster & Badge Generator PRO is a canvas-based designer featuring:

• Full undo/redo support
• Object selection and manipulation
• CUT and ENGRAVE layer separation
• Multiple shape primitives
• Text with font options
• Laser-safe SVG export

Perfect for coasters, badges, medals, ornaments, and circular signage.`,
    },
    {
      id: SECTION_IDS.STEP_BY_STEP,
      title: 'Step-by-Step Guide',
      steps: [
        {
          title: 'Set Coaster Size',
          content: 'Define diameter (standard coasters are 90-100mm). This sets your circular canvas.',
        },
        {
          title: 'Add Base Shape',
          content: 'The outer circle is your cut line. Add inner circles or shapes for design.',
        },
        {
          title: 'Add Text',
          content: 'Insert text elements. Use curved text for following the circular edge.',
        },
        {
          title: 'Add Decorations',
          content: 'Include lines, shapes, or imported graphics. Assign to cut or engrave layers.',
        },
        {
          title: 'Arrange Layers',
          content: 'Use layer controls to order elements. Cut layer should be on top.',
        },
        {
          title: 'Export',
          content: 'Download SVG with proper color coding for your laser software.',
        },
      ],
    },
    {
      id: SECTION_IDS.BEST_PRACTICES,
      title: 'Best Practices',
      tips: [
        'Standard coaster size is 90-100mm diameter for most cups',
        'Use 3-4mm material thickness for durability',
        'Keep engrave elements at least 3mm from cut edge',
        'Test cork-backed vs solid wood for heat resistance',
        'Create matching sets with consistent design elements',
        'Use Ctrl+Z liberally - undo is your friend!',
      ],
    },
    {
      id: SECTION_IDS.TROUBLESHOOTING,
      title: 'Troubleshooting',
      tips: [
        'Selection not working? Click directly on element outline',
        'Curved text not curving? Ensure radius matches your design',
        'Export missing layers? Check layer visibility settings',
        'Canvas too small? Zoom out or increase canvas size',
      ],
    },
  ],
};

export default tutorial;

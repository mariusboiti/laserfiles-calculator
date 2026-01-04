import type { TutorialData } from '@/components/tutorial/types';
import { SECTION_IDS } from '@/components/tutorial/types';

const tutorial: TutorialData = {
  toolSlug: 'jigsaw-maker',
  title: 'Jigsaw Maker Tutorial',
  description: 'Create custom jigsaw puzzles with photos, adjustable piece counts, and laser-safe SVG output.',
  estimatedTime: '5-7 min',
  difficulty: 'beginner',
  sections: [
    {
      id: SECTION_IDS.OVERVIEW,
      title: 'What is Jigsaw Maker?',
      content: `Jigsaw Maker generates laser-ready puzzle designs from any image. Features include:

• Photo mode for custom image puzzles
• Kids mode with simpler piece shapes
• Adjustable piece count and size
• Custom knob styles
• Kerf offset compensation
• Batch export options

Perfect for personalized gifts, educational toys, and custom promotional items.`,
    },
    {
      id: SECTION_IDS.STEP_BY_STEP,
      title: 'Step-by-Step Guide',
      steps: [
        {
          title: 'Choose Mode',
          content: 'Photo Mode for image puzzles, Kids Mode for simpler educational puzzles.',
        },
        {
          title: 'Upload Image (Photo Mode)',
          content: 'Select a high-resolution image. Best results with clear subjects and good contrast.',
        },
        {
          title: 'Set Puzzle Size',
          content: 'Define overall dimensions. Consider your material and laser bed size.',
        },
        {
          title: 'Configure Pieces',
          content: 'Set piece count (columns x rows). More pieces = harder puzzle.',
        },
        {
          title: 'Adjust Knob Style',
          content: 'Choose knob shape and size. Larger knobs are easier for children.',
        },
        {
          title: 'Apply Kerf Offset',
          content: 'Set laser kerf compensation for proper piece fit (typically 0.1-0.15mm).',
        },
        {
          title: 'Export',
          content: 'Download puzzle cut lines and optional engrave layer for the image.',
        },
      ],
    },
    {
      id: SECTION_IDS.BEST_PRACTICES,
      title: 'Best Practices',
      tips: [
        'Use 3-4mm plywood or MDF for durability',
        'Start with fewer pieces (4x3) for first attempts',
        'Engrave image at lower power to avoid burn-through',
        'Cut pieces after engraving to prevent alignment issues',
        'Test kerf with a small section before full puzzle',
        'Consider making a storage box to match the puzzle',
      ],
    },
    {
      id: SECTION_IDS.TROUBLESHOOTING,
      title: 'Troubleshooting',
      tips: [
        'Pieces too tight? Increase kerf offset',
        'Pieces too loose? Decrease kerf offset or use thicker material',
        'Image quality poor? Use higher resolution source (at least 1500px)',
        'Knobs breaking? Make them larger or use stronger material',
      ],
    },
  ],
};

export default tutorial;

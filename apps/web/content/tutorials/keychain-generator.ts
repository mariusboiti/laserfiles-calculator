import type { TutorialData } from '@/components/tutorial/types';
import { SECTION_IDS } from '@/components/tutorial/types';

const tutorial: TutorialData = {
  toolSlug: 'keychain-generator',
  title: 'Keychain Hub PRO Tutorial',
  description: 'Design laser-ready keychains with text paths, icons, and multiple shape options.',
  estimatedTime: '3-5 min',
  difficulty: 'beginner',
  sections: [
    {
      id: SECTION_IDS.OVERVIEW,
      title: 'What is Keychain Hub PRO?',
      content: `Keychain Hub PRO creates professional laser-ready keychains with:

• Text converted to real paths (no <text> elements)
• 80+ built-in icons
• Multiple keychain shapes and sizes
• Script and sans-serif font options
• 2-layer export (cut + engrave)
• Custom icon support

Perfect for personalized gifts, promotional items, and retail products.`,
    },
    {
      id: SECTION_IDS.STEP_BY_STEP,
      title: 'Step-by-Step Guide',
      steps: [
        {
          title: 'Choose Keychain Shape',
          content: 'Select from rectangle, oval, heart, or custom shapes. Set dimensions.',
        },
        {
          title: 'Add Text',
          content: 'Enter your text (name, message). Choose font style - script or sans-serif.',
        },
        {
          title: 'Add Icon (Optional)',
          content: 'Browse 80+ icons or upload custom SVG. Position and scale as needed.',
        },
        {
          title: 'Configure Hole',
          content: 'Set keyring hole position and size (typically 4-5mm diameter).',
        },
        {
          title: 'Preview',
          content: 'Check the design. Red = cut layer, Black = engrave layer.',
        },
        {
          title: 'Export',
          content: 'Download SVG with proper layer separation for your laser software.',
        },
      ],
    },
    {
      id: SECTION_IDS.BEST_PRACTICES,
      title: 'Best Practices',
      tips: [
        'Keep text readable at small sizes - avoid overly decorative fonts',
        'Position keyring hole away from text/design elements',
        'Use 3mm material thickness for durability',
        'Test fit keyring before bulk production',
        'Leave 2-3mm margin from edges to text',
        'Consider two-sided designs for premium products',
      ],
    },
    {
      id: SECTION_IDS.TROUBLESHOOTING,
      title: 'Troubleshooting',
      tips: [
        'Text too small? Increase keychain size or reduce text length',
        'Hole too close to edge? Adjust hole position or keychain size',
        'Icon not showing? Check if SVG is valid and properly uploaded',
        'Layers merged in export? Verify layer settings before export',
      ],
    },
  ],
};

export default tutorial;

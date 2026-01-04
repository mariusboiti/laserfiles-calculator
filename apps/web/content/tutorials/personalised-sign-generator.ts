import type { TutorialData } from '@/components/tutorial/types';
import { SECTION_IDS } from '@/components/tutorial/types';

const tutorial: TutorialData = {
  toolSlug: 'personalised-sign-generator',
  title: 'Personalised Sign Generator Tutorial',
  description: 'Create custom laser-cut signs with text, artwork, and professional layer management.',
  estimatedTime: '5-8 min',
  difficulty: 'intermediate',
  sections: [
    {
      id: SECTION_IDS.OVERVIEW,
      title: 'What is Personalised Sign Generator?',
      content: `The Personalised Sign Generator is a layer-based sign designer with professional features:

• Text converted to paths (no font dependency issues)
• 130+ built-in fonts
• AI sketch and silhouette generation
• Cut and engrave layer separation
• Outline offset for standoff lettering
• Real-time canvas preview

Perfect for house signs, business logos, gifts, and decorative plaques.`,
    },
    {
      id: SECTION_IDS.STEP_BY_STEP,
      title: 'Step-by-Step Guide',
      steps: [
        {
          title: 'Set Sign Dimensions',
          content: 'Define the overall sign size in millimeters. This sets your canvas bounds.',
        },
        {
          title: 'Add Text Layers',
          content: 'Click "Add Text" and enter your text. Each text element is a separate layer.',
        },
        {
          title: 'Style Your Text',
          content: 'Choose font, size, and whether it\'s a cut or engrave layer. Adjust position on canvas.',
        },
        {
          title: 'Add Artwork (Optional)',
          content: 'Use AI generation for silhouettes/sketches, or upload your own SVG/image.',
        },
        {
          title: 'Apply Outline Offset',
          content: 'For raised lettering effect, enable outline offset to create a backing layer.',
        },
        {
          title: 'Export Layers',
          content: 'Download separate SVGs for cut and engrave layers, or combined file.',
        },
      ],
    },
    {
      id: SECTION_IDS.BEST_PRACTICES,
      title: 'Best Practices',
      tips: [
        'Use bold, simple fonts for better cutting results',
        'Avoid fonts with very thin strokes - they may burn through',
        'Group related text elements for easier management',
        'Preview at 100% scale to check readability',
        'Test cut small letters first to verify font choice',
        'Keep safe margins from edges (at least 5mm)',
      ],
    },
    {
      id: SECTION_IDS.TROUBLESHOOTING,
      title: 'Troubleshooting',
      tips: [
        'Text not converting? Try a different font - some have complex paths',
        'Outline too thick/thin? Adjust the offset value',
        'AI generation failed? Try simpler prompts with clear subjects',
        'Export missing elements? Check all layers are visible before export',
      ],
    },
  ],
};

export default tutorial;

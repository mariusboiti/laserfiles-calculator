import type { TutorialData } from '@/components/tutorial/types';
import { SECTION_IDS } from '@/components/tutorial/types';

const tutorial: TutorialData = {
  toolSlug: 'panel-splitter',
  title: 'Panel Splitter Tutorial',
  description: 'Split large SVG designs into tiles that fit your laser bed, with registration marks for precise assembly.',
  estimatedTime: '3-5 min',
  difficulty: 'intermediate',
  sections: [
    {
      id: SECTION_IDS.OVERVIEW,
      title: 'What is Panel Splitter?',
      content: `Panel Splitter divides oversized SVG files into manageable tiles for your laser cutter. Features include:

• Automatic tiling based on your bed size
• Registration marks for accurate alignment
• Overlap options for seamless joins
• Batch export with numbered files

Perfect for large signs, wall art, or any design bigger than your laser bed.`,
    },
    {
      id: SECTION_IDS.STEP_BY_STEP,
      title: 'Step-by-Step Guide',
      steps: [
        {
          title: 'Upload Large SVG',
          content: 'Import your oversized SVG design. The tool shows the original dimensions.',
        },
        {
          title: 'Set Laser Bed Size',
          content: 'Enter your laser cutter\'s working area dimensions (e.g., 600x400mm).',
        },
        {
          title: 'Configure Overlap',
          content: 'Set overlap amount (5-10mm recommended) for easier alignment during assembly.',
        },
        {
          title: 'Add Registration Marks',
          content: 'Enable registration marks to help align tiles during cutting and assembly.',
        },
        {
          title: 'Preview Tiles',
          content: 'Review how the design will be split. Adjust settings if needed.',
        },
        {
          title: 'Export Tiles',
          content: 'Download individual SVG files or a ZIP archive with all tiles.',
        },
      ],
    },
    {
      id: SECTION_IDS.BEST_PRACTICES,
      title: 'Best Practices',
      tips: [
        'Use at least 5mm overlap for structural integrity',
        'Number tiles consistently (left-to-right, top-to-bottom)',
        'Cut a test tile first to verify alignment marks work',
        'Keep critical design elements away from tile edges when possible',
        'Use consistent material positioning for each tile',
        'Consider using a jig for repeatable positioning',
      ],
    },
    {
      id: SECTION_IDS.TROUBLESHOOTING,
      title: 'Troubleshooting',
      tips: [
        'Tiles not aligning? Increase overlap or check registration marks',
        'Gaps between tiles? Verify material is positioned consistently',
        'Design elements cut off? Check SVG bounds match actual content',
        'Too many tiles? Consider simplifying design or using larger material',
      ],
    },
  ],
};

export default tutorial;

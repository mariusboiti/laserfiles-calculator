import type { TutorialData } from '@/components/tutorial/types';
import { SECTION_IDS } from '@/components/tutorial/types';

const tutorial: TutorialData = {
  toolSlug: 'boxmaker',
  title: 'BoxMaker Tutorial',
  description: 'Learn how to create laser-ready finger-joint boxes with custom dimensions, artwork, and professional features.',
  estimatedTime: '5-10 min',
  difficulty: 'beginner',
  sections: [
    {
      id: SECTION_IDS.OVERVIEW,
      title: 'What is BoxMaker?',
      content: `BoxMaker generates laser-ready SVG files for finger-joint boxes. Perfect for:

• Gift boxes and packaging
• Storage containers
• Display cases
• Custom enclosures

The tool supports multiple box types including simple boxes, hinged lid boxes, and sliding drawer boxes. All outputs are optimized for laser cutting with proper kerf compensation.`,
    },
    {
      id: SECTION_IDS.STEP_BY_STEP,
      title: 'Step-by-Step Guide',
      steps: [
        {
          title: 'Select Box Type',
          content: 'Choose from Simple Box, Hinged Lid Box, or Sliding Drawer based on your project needs.',
        },
        {
          title: 'Set Dimensions',
          content: 'Enter the interior dimensions (width, height, depth) in millimeters. The tool automatically calculates material needed.',
        },
        {
          title: 'Configure Material',
          content: 'Set your material thickness (typically 3mm for plywood). This affects finger joint sizing.',
        },
        {
          title: 'Add Face Artwork (Optional)',
          content: 'Select a face (Top, Front, etc.) and add artwork using AI generation, photo upload, or text.',
        },
        {
          title: 'Adjust Placement',
          content: 'Use the X, Y, Rotation, and Scale controls to position your artwork precisely on the selected face.',
        },
        {
          title: 'Preview & Export',
          content: 'Review the preview, then export as SVG. Red lines are cut paths, black areas are engrave paths.',
        },
      ],
    },
    {
      id: SECTION_IDS.BEST_PRACTICES,
      title: 'Best Practices',
      tips: [
        'Always do a test cut with scrap material first to verify fit',
        'Use 0.1-0.15mm kerf offset for most laser cutters',
        'For tight-fitting lids, add 0.2-0.3mm tolerance',
        'Keep artwork away from edges (at least 2mm margin)',
        'Use white backgrounds for AI artwork to ensure clean traces',
        'Export at the correct DPI for your laser software (usually 96 or 72)',
      ],
    },
    {
      id: SECTION_IDS.TROUBLESHOOTING,
      title: 'Troubleshooting',
      tips: [
        'Joints too tight? Increase kerf offset or add tolerance',
        'Joints too loose? Decrease kerf offset',
        'Artwork not showing? Check if the face is selected and artwork is within bounds',
        'Trace not working? Use photos with clear contrast and white backgrounds',
        'SVG not importing correctly? Ensure your laser software supports the SVG version',
      ],
    },
    {
      id: SECTION_IDS.VIDEO,
      title: 'Video Tutorial',
      content: 'Coming Soon',
    },
  ],
};

export default tutorial;

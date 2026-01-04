import type { TutorialData } from '@/components/tutorial/types';
import { SECTION_IDS } from '@/components/tutorial/types';

const tutorial: TutorialData = {
  toolSlug: 'engraveprep',
  title: 'EngravePrep Tutorial',
  description: 'Prepare photos for laser engraving with professional contrast adjustment and dithering algorithms.',
  estimatedTime: '3-5 min',
  difficulty: 'beginner',
  sections: [
    {
      id: SECTION_IDS.OVERVIEW,
      title: 'What is EngravePrep?',
      content: `EngravePrep transforms regular photos into laser-engraving-ready images. The tool applies:

• Contrast and brightness optimization
• Multiple dithering algorithms (Floyd-Steinberg, Ordered, etc.)
• Resolution adjustment for your laser's DPI
• Grayscale conversion with gamma correction

Perfect for photo engravings on wood, leather, acrylic, and other materials.`,
    },
    {
      id: SECTION_IDS.STEP_BY_STEP,
      title: 'Step-by-Step Guide',
      steps: [
        {
          title: 'Upload Your Photo',
          content: 'Drag and drop or click to upload. Works best with high-contrast portraits or images with clear subjects.',
        },
        {
          title: 'Adjust Contrast & Brightness',
          content: 'Use the sliders to enhance the image. Higher contrast usually works better for laser engraving.',
        },
        {
          title: 'Select Dithering Algorithm',
          content: 'Floyd-Steinberg gives smooth gradients. Ordered dithering creates a more mechanical look. Try both!',
        },
        {
          title: 'Set Output Resolution',
          content: 'Match your laser\'s DPI setting (commonly 254, 300, or 500 DPI).',
        },
        {
          title: 'Preview & Export',
          content: 'Review the result and export. The output is ready for direct import into your laser software.',
        },
      ],
    },
    {
      id: SECTION_IDS.BEST_PRACTICES,
      title: 'Best Practices',
      tips: [
        'Start with high-resolution source images (at least 1000px wide)',
        'Portraits work best with even lighting and clear facial features',
        'Remove busy backgrounds before uploading for cleaner results',
        'Test on scrap material first - different materials need different settings',
        'Wood typically needs higher contrast than acrylic',
        'For dark materials, consider inverting the image',
      ],
    },
    {
      id: SECTION_IDS.TROUBLESHOOTING,
      title: 'Troubleshooting',
      tips: [
        'Image too dark? Increase brightness and reduce contrast',
        'Lost details? Try a different dithering algorithm',
        'Grainy result? Increase resolution or use ordered dithering',
        'Engraving too faint? Increase contrast or adjust laser power',
        'File too large? Reduce output resolution',
      ],
    },
  ],
};

export default tutorial;

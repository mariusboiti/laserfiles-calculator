import type { TutorialData } from '@/components/tutorial/types';
import { SECTION_IDS } from '@/components/tutorial/types';

const tutorial: TutorialData = {
  toolSlug: 'bulk-name-tags',
  title: 'Bulk Name Tags Tutorial',
  description: 'Generate hundreds of personalized name tags from CSV data with automatic layout and batch export.',
  estimatedTime: '5-7 min',
  difficulty: 'beginner',
  sections: [
    {
      id: SECTION_IDS.OVERVIEW,
      title: 'What is Bulk Name Tags?',
      content: `Bulk Name Tags automates the creation of personalized name tags for events, businesses, or gifts. Features:

• CSV/Excel data import
• Multiple tag shapes and styles
• Font customization
• Automatic text fitting
• Batch SVG export
• Sheet layout optimization

Perfect for conferences, weddings, corporate events, and personalized product lines.`,
    },
    {
      id: SECTION_IDS.STEP_BY_STEP,
      title: 'Step-by-Step Guide',
      steps: [
        {
          title: 'Prepare Your Data',
          content: 'Create a CSV file with names. Column headers like "name", "first_name", or "text" are auto-detected.',
        },
        {
          title: 'Upload CSV',
          content: 'Drag and drop your CSV file or paste data directly. Preview shows detected names.',
        },
        {
          title: 'Choose Tag Design',
          content: 'Select shape (rectangle, oval, badge), size, and corner style.',
        },
        {
          title: 'Customize Typography',
          content: 'Pick a font, adjust size, and set alignment. Text auto-scales to fit.',
        },
        {
          title: 'Add Decorations (Optional)',
          content: 'Include borders, icons, or secondary text lines.',
        },
        {
          title: 'Export',
          content: 'Download individual SVGs or a ZIP with all tags. Choose sheet layout for efficient cutting.',
        },
      ],
    },
    {
      id: SECTION_IDS.BEST_PRACTICES,
      title: 'Best Practices',
      tips: [
        'Clean your data before importing - remove duplicates and fix typos',
        'Use consistent name formats (all caps or title case)',
        'Test with 2-3 names before processing the full batch',
        'Leave adequate margins for lanyard holes or pins',
        'Consider font readability at the chosen tag size',
        'Group similar-length names for consistent appearance',
      ],
    },
    {
      id: SECTION_IDS.TROUBLESHOOTING,
      title: 'Troubleshooting',
      tips: [
        'Names not importing? Check CSV column headers and encoding (use UTF-8)',
        'Text too small? Increase tag size or use a condensed font',
        'Names cut off? Enable auto-fit or reduce font size',
        'Special characters missing? Ensure your font supports those characters',
      ],
    },
  ],
};

export default tutorial;

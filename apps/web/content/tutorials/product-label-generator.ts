import type { TutorialData } from '@/components/tutorial/types';
import { SECTION_IDS } from '@/components/tutorial/types';

const tutorial: TutorialData = {
  toolSlug: 'product-label-generator',
  title: 'Product Label & SKU Generator Tutorial',
  description: 'Create professional product labels with SKU codes, QR codes, and batch export.',
  estimatedTime: '4-6 min',
  difficulty: 'beginner',
  sections: [
    {
      id: SECTION_IDS.OVERVIEW,
      title: 'What is Product Label Generator?',
      content: `The Product Label Generator creates professional labels for laser cutting/engraving. Features:

• SKU code generation
• QR code integration
• CSV batch import
• Multiple label layouts
• Custom sizing
• Efficient sheet layouts

Perfect for product tagging, inventory management, and retail labeling.`,
    },
    {
      id: SECTION_IDS.STEP_BY_STEP,
      title: 'Step-by-Step Guide',
      steps: [
        {
          title: 'Choose Label Size',
          content: 'Select from standard sizes or enter custom dimensions.',
        },
        {
          title: 'Enter Product Info',
          content: 'Add product name, SKU, price, or other text fields.',
        },
        {
          title: 'Add QR Code (Optional)',
          content: 'Generate QR codes linking to URLs, product pages, or custom data.',
        },
        {
          title: 'Import Batch Data',
          content: 'Upload CSV for multiple products. Map columns to label fields.',
        },
        {
          title: 'Customize Layout',
          content: 'Arrange text, codes, and graphics. Set fonts and sizes.',
        },
        {
          title: 'Export Labels',
          content: 'Download individual SVGs or optimized sheet layouts.',
        },
      ],
    },
    {
      id: SECTION_IDS.BEST_PRACTICES,
      title: 'Best Practices',
      tips: [
        'Use consistent label sizes across product lines',
        'Keep QR codes at least 15x15mm for reliable scanning',
        'Test QR code scanning before batch production',
        'Include human-readable SKU alongside QR code',
        'Use durable materials for labels that will be handled',
        'Consider adding mounting holes or adhesive areas',
      ],
    },
    {
      id: SECTION_IDS.TROUBLESHOOTING,
      title: 'Troubleshooting',
      tips: [
        'QR not scanning? Increase size or check contrast',
        'Text too small? Reduce information or increase label size',
        'CSV not importing? Check encoding (UTF-8) and column format',
        'Labels misaligned? Verify material positioning and sheet size',
      ],
    },
  ],
};

export default tutorial;

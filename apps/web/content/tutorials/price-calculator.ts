import type { TutorialData } from '@/components/tutorial/types';
import { SECTION_IDS } from '@/components/tutorial/types';

const tutorial: TutorialData = {
  toolSlug: 'price-calculator',
  title: 'Price Calculator Tutorial',
  description: 'Calculate accurate prices for laser cutting projects with material costs, time estimates, and profit margins.',
  estimatedTime: '10-15 min',
  difficulty: 'intermediate',
  sections: [
    {
      id: SECTION_IDS.OVERVIEW,
      title: 'What is Price Calculator?',
      content: `The Price Calculator is a comprehensive business tool for laser cutting professionals. Features include:

• Material cost database with custom pricing
• Cutting and engraving time estimates
• Profit margin calculations
• Quote generation
• Order management
• Customer database

Perfect for freelancers, small businesses, and production shops.`,
    },
    {
      id: SECTION_IDS.STEP_BY_STEP,
      title: 'Getting Started',
      steps: [
        {
          title: 'Set Up Materials',
          content: 'Go to Materials section and add your stock materials with prices per sheet/unit.',
        },
        {
          title: 'Configure Pricing Rules',
          content: 'Set your hourly rate, machine costs, and default profit margins in Pricing settings.',
        },
        {
          title: 'Import or Create Products',
          content: 'Add template products with predefined materials and time estimates.',
        },
        {
          title: 'Create a Quote',
          content: 'Build quotes by selecting products, quantities, and customizations.',
        },
        {
          title: 'Convert to Order',
          content: 'Once approved, convert quotes to orders and track production.',
        },
        {
          title: 'Manage Customers',
          content: 'Store customer information for repeat orders and invoicing.',
        },
      ],
    },
    {
      id: SECTION_IDS.BEST_PRACTICES,
      title: 'Best Practices',
      tips: [
        'Update material prices regularly as supplier costs change',
        'Track actual cutting times to improve estimates over time',
        'Include setup time in your calculations (file prep, material loading)',
        'Factor in material waste (typically 10-20% for irregular shapes)',
        'Create product templates for frequently ordered items',
        'Use seasonal pricing for holiday rush periods',
        'Always add a buffer for unexpected complications',
      ],
    },
    {
      id: SECTION_IDS.TROUBLESHOOTING,
      title: 'Troubleshooting',
      tips: [
        'Prices too low? Check if all costs are included (materials, time, overhead)',
        'Estimates inaccurate? Measure actual cutting times and update templates',
        'Missing materials? Add new materials in the Materials section',
        'Quote not saving? Ensure all required fields are filled',
      ],
    },
  ],
};

export default tutorial;

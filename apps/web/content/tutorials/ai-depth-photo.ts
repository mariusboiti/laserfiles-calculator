import type { TutorialData } from '@/components/tutorial/types';
import { SECTION_IDS } from '@/components/tutorial/types';

const tutorial: TutorialData = {
  toolSlug: 'ai-depth-photo',
  title: 'AI Depth Engraving Tutorial',
  description: 'Generate professional height maps for 3D-effect laser engravings using AI.',
  estimatedTime: '5-8 min',
  difficulty: 'advanced',
  sections: [
    {
      id: SECTION_IDS.OVERVIEW,
      title: 'What is AI Depth Engraving?',
      content: `AI Depth Engraving creates height maps that produce 3D-effect engravings. Features:

• AI-powered depth estimation
• Multiple material profiles
• Depth zone control
• Histogram validation
• Power curve optimization
• Real-time preview

Perfect for portraits, landscapes, logos, and artistic engravings with dimensional depth.`,
    },
    {
      id: SECTION_IDS.STEP_BY_STEP,
      title: 'Step-by-Step Guide',
      steps: [
        {
          title: 'Upload Image',
          content: 'Select a high-quality image. Best results with clear subjects and good depth cues.',
        },
        {
          title: 'Generate Depth Map',
          content: 'AI analyzes the image to estimate depth. Processing takes 10-30 seconds.',
        },
        {
          title: 'Select Material Profile',
          content: 'Choose your material (wood, acrylic, leather) for optimized power curves.',
        },
        {
          title: 'Adjust Depth Zones',
          content: 'Fine-tune which areas are lighter/darker for desired 3D effect.',
        },
        {
          title: 'Validate Histogram',
          content: 'Check depth distribution. Good maps have smooth gradients, not just black/white.',
        },
        {
          title: 'Export Height Map',
          content: 'Download grayscale image optimized for your laser\'s variable power mode.',
        },
      ],
    },
    {
      id: SECTION_IDS.BEST_PRACTICES,
      title: 'Best Practices',
      tips: [
        'Use images with clear foreground/background separation',
        'Portraits work better with even lighting and visible depth cues',
        'Start with material test grids to calibrate power settings',
        'Higher resolution = more detail but longer engrave time',
        'Keep maximum power below material burn-through threshold',
        'Multiple light passes often look better than one heavy pass',
      ],
    },
    {
      id: SECTION_IDS.TROUBLESHOOTING,
      title: 'Troubleshooting',
      tips: [
        'Flat result? Image may lack depth cues - try different photo',
        'Inverted depth? Use invert option to flip depth direction',
        'Too much contrast? Adjust depth zone curves for smoother gradient',
        'Material burning? Reduce max power or increase speed',
      ],
    },
  ],
};

export default tutorial;

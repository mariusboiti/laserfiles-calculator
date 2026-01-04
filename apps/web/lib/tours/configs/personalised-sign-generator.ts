import type { TourConfig } from '../types';

export const personalisedSignGeneratorTour: TourConfig = {
  toolSlug: 'personalised-sign-generator',
  steps: [
    {
      id: 'intro',
      target: 'settings',
      titleKey: 'tour.sign-generator.intro.title',
      bodyKey: 'tour.sign-generator.intro.body',
      titleFallback: 'Welcome to Sign Generator',
      bodyFallback: 'Create beautiful personalized signs with text, shapes, and AI-generated graphics. Perfect for home decor, gifts, and custom orders.',
      placement: 'right',
    },
    {
      id: 'text',
      target: 'text-editor',
      titleKey: 'tour.sign-generator.text.title',
      bodyKey: 'tour.sign-generator.text.body',
      titleFallback: 'Add Your Text',
      bodyFallback: 'Enter your text and choose from 130+ fonts. Adjust size, spacing, and alignment to get the perfect look.',
      placement: 'right',
    },
    {
      id: 'shapes',
      target: 'shapes',
      titleKey: 'tour.sign-generator.shapes.title',
      bodyKey: 'tour.sign-generator.shapes.body',
      titleFallback: 'Add Shapes & Graphics',
      bodyFallback: 'Browse the ornament library or use AI to generate custom graphics. Drag elements to position them on your sign.',
      placement: 'right',
    },
    {
      id: 'canvas',
      target: 'canvas',
      titleKey: 'tour.sign-generator.canvas.title',
      bodyKey: 'tour.sign-generator.canvas.body',
      titleFallback: 'Design Canvas',
      bodyFallback: 'See your sign come together in real-time. Select, move, and resize elements directly on the canvas.',
      placement: 'left',
    },
    {
      id: 'export',
      target: 'export',
      titleKey: 'tour.sign-generator.export.title',
      bodyKey: 'tour.sign-generator.export.body',
      titleFallback: 'Export Your Sign',
      bodyFallback: 'Download as SVG for cutting or engraving. The export includes separate layers for cut and engrave operations.',
      placement: 'bottom',
    },
  ],
};

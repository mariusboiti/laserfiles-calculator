import type { TourConfig } from '../types';

export const engraveprepTour: TourConfig = {
  toolSlug: 'engraveprep',
  steps: [
    {
      id: 'intro',
      target: 'settings',
      titleKey: 'tour.engraveprep.intro.title',
      bodyKey: 'tour.engraveprep.intro.body',
      titleFallback: 'Welcome to EngravePrep',
      bodyFallback: 'Prepare images for laser engraving. Convert photos to optimized grayscale with dithering patterns perfect for your laser.',
      placement: 'right',
    },
    {
      id: 'upload',
      target: 'upload',
      titleKey: 'tour.engraveprep.upload.title',
      bodyKey: 'tour.engraveprep.upload.body',
      titleFallback: 'Upload an Image',
      bodyFallback: 'Upload a photo or image file. Supported formats include JPG, PNG, and WebP. Higher resolution images give better results.',
      placement: 'right',
    },
    {
      id: 'adjustments',
      target: 'adjustments',
      titleKey: 'tour.engraveprep.adjustments.title',
      bodyKey: 'tour.engraveprep.adjustments.body',
      titleFallback: 'Adjust Image Settings',
      bodyFallback: 'Fine-tune brightness, contrast, and sharpness. Choose a dithering algorithm that works best for your material and laser.',
      placement: 'right',
    },
    {
      id: 'canvas',
      target: 'canvas',
      titleKey: 'tour.engraveprep.canvas.title',
      bodyKey: 'tour.engraveprep.canvas.body',
      titleFallback: 'Preview Result',
      bodyFallback: 'See a real-time preview of how your image will look when engraved. Compare original and processed versions side by side.',
      placement: 'left',
    },
    {
      id: 'export',
      target: 'export',
      titleKey: 'tour.engraveprep.export.title',
      bodyKey: 'tour.engraveprep.export.body',
      titleFallback: 'Export for Engraving',
      bodyFallback: 'Download the processed image optimized for your laser software. Choose the output format and size for your project.',
      placement: 'bottom',
    },
  ],
};

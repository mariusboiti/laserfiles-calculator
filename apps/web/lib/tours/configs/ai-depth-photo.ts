import type { TourConfig } from '../types';

export const aiDepthPhotoTour: TourConfig = {
  toolSlug: 'ai-depth-photo',
  steps: [
    {
      id: 'intro',
      target: 'settings',
      titleKey: 'tour.ai-depth-photo.intro.title',
      bodyKey: 'tour.ai-depth-photo.intro.body',
      titleFallback: 'Welcome to AI Depth Engraving',
      bodyFallback: 'Transform photos into stunning 3D relief engravings using AI depth mapping. Create lithophanes and bas-relief artwork.',
      placement: 'right',
    },
    {
      id: 'upload',
      target: 'upload',
      titleKey: 'tour.ai-depth-photo.upload.title',
      bodyKey: 'tour.ai-depth-photo.upload.body',
      titleFallback: 'Upload Your Photo',
      bodyFallback: 'Choose a photo with clear subjects. Portraits and objects with defined edges work best for depth extraction.',
      placement: 'right',
    },
    {
      id: 'depth-settings',
      target: 'depth-settings',
      titleKey: 'tour.ai-depth-photo.depth.title',
      bodyKey: 'tour.ai-depth-photo.depth.body',
      titleFallback: 'Adjust Depth Settings',
      bodyFallback: 'Fine-tune the depth map intensity and choose the engraving style. Different materials require different depth ranges.',
      placement: 'right',
    },
    {
      id: 'canvas',
      target: 'canvas',
      titleKey: 'tour.ai-depth-photo.canvas.title',
      bodyKey: 'tour.ai-depth-photo.canvas.body',
      titleFallback: 'Preview Depth Map',
      bodyFallback: 'See the AI-generated depth map and preview how your engraving will look. Lighter areas will engrave deeper.',
      placement: 'left',
    },
    {
      id: 'export',
      target: 'export',
      titleKey: 'tour.ai-depth-photo.export.title',
      bodyKey: 'tour.ai-depth-photo.export.body',
      titleFallback: 'Export for Engraving',
      bodyFallback: 'Download the optimized grayscale image for variable-power engraving. Includes recommended power settings for your material.',
      placement: 'bottom',
    },
  ],
};

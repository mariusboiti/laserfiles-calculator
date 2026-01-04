import type { TourConfig } from '../types';

export const jigsawMakerTour: TourConfig = {
  toolSlug: 'jigsaw-maker',
  steps: [
    {
      id: 'intro',
      target: 'settings',
      titleKey: 'tour.jigsaw-maker.intro.title',
      bodyKey: 'tour.jigsaw-maker.intro.body',
      titleFallback: 'Welcome to Jigsaw Maker',
      bodyFallback: 'Create custom jigsaw puzzles from any image. Generate professional-quality puzzle patterns with interlocking pieces.',
      placement: 'right',
    },
    {
      id: 'upload',
      target: 'upload',
      titleKey: 'tour.jigsaw-maker.upload.title',
      bodyKey: 'tour.jigsaw-maker.upload.body',
      titleFallback: 'Upload Your Image',
      bodyFallback: 'Choose a photo or artwork for your puzzle. The image will be used for the engrave layer while pieces are cut.',
      placement: 'right',
    },
    {
      id: 'puzzle-settings',
      target: 'puzzle-settings',
      titleKey: 'tour.jigsaw-maker.settings.title',
      bodyKey: 'tour.jigsaw-maker.settings.body',
      titleFallback: 'Configure Puzzle',
      bodyFallback: 'Set the number of pieces, puzzle size, and piece style. More pieces create a more challenging puzzle.',
      placement: 'right',
    },
    {
      id: 'canvas',
      target: 'canvas',
      titleKey: 'tour.jigsaw-maker.canvas.title',
      bodyKey: 'tour.jigsaw-maker.canvas.body',
      titleFallback: 'Preview Puzzle',
      bodyFallback: 'See your puzzle layout with piece outlines overlaid on the image. Each piece is uniquely shaped for easy assembly.',
      placement: 'left',
    },
    {
      id: 'export',
      target: 'export',
      titleKey: 'tour.jigsaw-maker.export.title',
      bodyKey: 'tour.jigsaw-maker.export.body',
      titleFallback: 'Export Puzzle',
      bodyFallback: 'Download separate files for cutting (pieces) and engraving (image). Includes a frame option for the finished puzzle.',
      placement: 'bottom',
    },
  ],
};

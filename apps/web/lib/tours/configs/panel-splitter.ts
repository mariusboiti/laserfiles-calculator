import type { TourConfig } from '../types';

export const panelSplitterTour: TourConfig = {
  toolSlug: 'panel-splitter',
  steps: [
    {
      id: 'intro',
      target: 'settings',
      titleKey: 'tour.panel-splitter.intro.title',
      bodyKey: 'tour.panel-splitter.intro.body',
      titleFallback: 'Welcome to Panel Splitter',
      bodyFallback: 'Split large designs into smaller panels that fit your laser bed. Perfect for oversized signs, wall art, and large format projects.',
      placement: 'right',
    },
    {
      id: 'upload',
      target: 'upload',
      titleKey: 'tour.panel-splitter.upload.title',
      bodyKey: 'tour.panel-splitter.upload.body',
      titleFallback: 'Upload Your Design',
      bodyFallback: 'Upload an SVG file that\'s too large for your laser bed. The tool will analyze the design and prepare it for splitting.',
      placement: 'right',
    },
    {
      id: 'grid',
      target: 'grid-settings',
      titleKey: 'tour.panel-splitter.grid.title',
      bodyKey: 'tour.panel-splitter.grid.body',
      titleFallback: 'Configure Panel Grid',
      bodyFallback: 'Set your laser bed size and choose how many rows and columns to split into. Adjust overlap for alignment tabs.',
      placement: 'right',
    },
    {
      id: 'canvas',
      target: 'canvas',
      titleKey: 'tour.panel-splitter.canvas.title',
      bodyKey: 'tour.panel-splitter.canvas.body',
      titleFallback: 'Preview Panels',
      bodyFallback: 'See how your design will be split. Each colored section represents a separate panel. Click panels to select them for export.',
      placement: 'left',
    },
    {
      id: 'export',
      target: 'export',
      titleKey: 'tour.panel-splitter.export.title',
      bodyKey: 'tour.panel-splitter.export.body',
      titleFallback: 'Export Panels',
      bodyFallback: 'Download individual panels or all panels as a ZIP file. Each panel is sized to fit your laser bed.',
      placement: 'bottom',
    },
  ],
};

import type { TourConfig } from '../types';

export const bulkNameTagsTour: TourConfig = {
  toolSlug: 'bulk-name-tags',
  steps: [
    {
      id: 'intro',
      target: 'settings',
      titleKey: 'tour.bulk-name-tags.intro.title',
      bodyKey: 'tour.bulk-name-tags.intro.body',
      titleFallback: 'Welcome to Bulk Name Tags',
      bodyFallback: 'Generate multiple personalized name tags at once. Perfect for events, teams, weddings, and corporate gifts.',
      placement: 'right',
    },
    {
      id: 'template',
      target: 'template',
      titleKey: 'tour.bulk-name-tags.template.title',
      bodyKey: 'tour.bulk-name-tags.template.body',
      titleFallback: 'Choose a Template',
      bodyFallback: 'Select from pre-designed templates or create your own. Each template has customizable size, shape, and decoration options.',
      placement: 'right',
    },
    {
      id: 'names',
      target: 'names-input',
      titleKey: 'tour.bulk-name-tags.names.title',
      bodyKey: 'tour.bulk-name-tags.names.body',
      titleFallback: 'Enter Names',
      bodyFallback: 'Type or paste your list of names, one per line. You can also import from CSV for large batches.',
      placement: 'right',
    },
    {
      id: 'canvas',
      target: 'canvas',
      titleKey: 'tour.bulk-name-tags.canvas.title',
      bodyKey: 'tour.bulk-name-tags.canvas.body',
      titleFallback: 'Preview Tags',
      bodyFallback: 'See all your name tags laid out for cutting. The tool automatically arranges them to minimize material waste.',
      placement: 'left',
    },
    {
      id: 'export',
      target: 'export',
      titleKey: 'tour.bulk-name-tags.export.title',
      bodyKey: 'tour.bulk-name-tags.export.body',
      titleFallback: 'Export for Cutting',
      bodyFallback: 'Download your tags as SVG or DXF. All tags are nested efficiently on sheets matching your laser bed size.',
      placement: 'bottom',
    },
  ],
};

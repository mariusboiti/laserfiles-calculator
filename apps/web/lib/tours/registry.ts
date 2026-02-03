/**
 * Tour Registry
 * Central registry for all tour configurations
 */

import type { TourConfig } from './types';
import { boxmakerTour } from './configs/boxmaker';
import { panelSplitterTour } from './configs/panel-splitter';
import { bulkNameTagsTour } from './configs/bulk-name-tags';
import { engraveprepTour } from './configs/engraveprep';
import { personalisedSignGeneratorTour } from './configs/personalised-sign-generator';
import { jigsawMakerTour } from './configs/jigsaw-maker';
import { aiDepthPhotoTour } from './configs/ai-depth-photo';
import { nestingTour } from './configs/nesting';

const tourRegistry: Record<string, TourConfig> = {
  'boxmaker': boxmakerTour,
  'panel-splitter': panelSplitterTour,
  'bulk-name-tags': bulkNameTagsTour,
  'engraveprep': engraveprepTour,
  'engrave-prep': engraveprepTour,
  'personalised-sign-generator': personalisedSignGeneratorTour,
  'jigsaw-maker': jigsawMakerTour,
  'puzzle-maker': jigsawMakerTour,
  'ai-depth-photo': aiDepthPhotoTour,
  'ai-depth-engraving': aiDepthPhotoTour,
  'nesting': nestingTour,
};

/**
 * Get tour configuration for a tool
 */
export function getTourConfig(toolSlug: string): TourConfig | null {
  return tourRegistry[toolSlug] || null;
}

/**
 * Check if a tool has a tour available
 */
export function hasTour(toolSlug: string): boolean {
  return toolSlug in tourRegistry;
}

/**
 * Get all available tour tool slugs
 */
export function getAvailableTours(): string[] {
  return Object.keys(tourRegistry);
}

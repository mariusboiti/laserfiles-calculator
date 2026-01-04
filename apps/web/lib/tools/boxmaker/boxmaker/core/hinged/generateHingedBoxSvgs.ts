/**
 * Hinged Box Generator - Now using parametric generator based on user template
 * This file maintains backward compatibility with existing BoxMaker interface
 */

import type { HingedBoxPanels, HingedBoxSvgs, HingedInputs } from '../types';
import { 
  generateHingedBoxPanels as generateParametricPanels,
  generateHingedBoxSvgsFromPanels as generateParametricSvgs 
} from './parametricGenerator';

/**
 * Generate hinged box panels using new parametric generator
 * @param input - Box dimensions and parameters
 * @returns Panel geometry for all 6 panels
 */
export function generateHingedBoxPanels(input: HingedInputs): HingedBoxPanels {
  return generateParametricPanels(input);
}

/**
 * Generate SVG strings from panel geometry
 * @param panels - Panel geometry
 * @returns SVG strings for all 6 panels (100% orthogonal M/L/Z only)
 */
export function generateHingedBoxSvgsFromPanels(panels: HingedBoxPanels): HingedBoxSvgs {
  return generateParametricSvgs(panels, 'parametric');
}

export function generateHingedBoxSvgsFromPanelsWithMode(
  panels: HingedBoxPanels,
  mode: 'template' | 'parametric',
  input?: HingedInputs,
): HingedBoxSvgs {
  return generateParametricSvgs(panels, mode, input);
}

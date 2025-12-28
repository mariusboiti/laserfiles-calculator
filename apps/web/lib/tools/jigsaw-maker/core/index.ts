/**
 * Jigsaw Maker - Unified Entry Point
 * Routes to PathOps-only engine (new default)
 */

import { generateJigsawPathOps } from './generateJigsawPathOps';
import type { JigsawSettings, JigsawOutput } from '../types/jigsawV2';

/**
 * Main entry point for jigsaw generation
 * Uses PathOps-only boolean engine
 */
export async function generateJigsaw(settings: JigsawSettings): Promise<JigsawOutput> {
  return generateJigsawPathOps(settings);
}

// Re-export types
export type { JigsawSettings, JigsawOutput, PieceInfo, Diagnostics } from '../types/jigsawV2';
export { DEFAULT_SETTINGS, SHEET_PRESETS, FIT_MODE_CLEARANCE } from '../types/jigsawV2';

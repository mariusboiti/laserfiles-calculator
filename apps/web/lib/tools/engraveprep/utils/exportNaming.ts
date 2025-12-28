/**
 * Export naming utilities for EngravePrep
 * Standardized filename generation
 */

import type { DitherMode, ExportFormat } from '../types';

/**
 * Sanitize filename - remove special characters
 */
export function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50); // Max 50 chars
}

/**
 * Generate standardized export filename
 * Format: engraveprep-{source}-{dither}-{width}px.{ext}
 */
export function generateExportFilename(
  sourceFileName: string | null,
  ditherMode: DitherMode,
  widthPx: number,
  format: ExportFormat,
  inverted: boolean = false
): string {
  const parts: string[] = ['engraveprep'];
  
  // Add source filename base (without extension)
  if (sourceFileName) {
    const baseName = sourceFileName.replace(/\.[^/.]+$/, ''); // Remove extension
    const sanitized = sanitizeFilename(baseName);
    if (sanitized) {
      parts.push(sanitized);
    }
  }
  
  // Add dither mode
  const ditherName = ditherMode === 'floyd-steinberg' ? 'floyd' : ditherMode;
  if (ditherMode !== 'none') {
    parts.push(ditherName);
  }
  
  // Add width
  parts.push(`${widthPx}px`);
  
  // Add inverted flag
  if (inverted) {
    parts.push('inverted');
  }
  
  const filename = parts.join('-');
  return `${filename}.${format}`;
}

/**
 * Generate filename for test card export
 */
export function generateTestCardFilename(
  patternType: string,
  widthPx: number,
  format: ExportFormat
): string {
  return `engraveprep-testcard-${patternType}-${widthPx}px.${format}`;
}

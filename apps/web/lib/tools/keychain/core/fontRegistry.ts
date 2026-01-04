/**
 * Keychain Hub V2 - Font Registry
 * Load and cache OpenType fonts for text-to-path conversion
 */

import opentype from 'opentype.js';

// Font identifiers - now dynamic based on filename
export type FontId = string;

// Font configuration
export interface FontConfig {
  id: FontId;
  label: string;
  url: string;
}

// Available fonts - dynamically loaded
export const FONTS: FontConfig[] = [];

// Initialize fonts list from available TTF files
import { AVAILABLE_FONTS } from '../config/fontList';

// Register all available fonts on module load
AVAILABLE_FONTS.forEach(filename => {
  const id = filename.replace(/\.(ttf|otf)$/i, '');
  const label = id.replace(/[-_]/g, ' ');
  const url = `/fonts/keychain/${encodeURIComponent(filename)}`;
  const idKey = id.toLowerCase();
  if (!FONTS.find(f => f.id.toLowerCase() === idKey)) {
    FONTS.push({ id, label, url });
  }
});

// Font cache
const fontCache: Map<FontId, opentype.Font> = new Map();
const loadingPromises: Map<FontId, Promise<opentype.Font>> = new Map();

/**
 * Get font config by ID
 */
export function getFontConfig(fontId: FontId): FontConfig | null {
  return FONTS.find(f => f.id === fontId) || null;
}

/**
 * Load a font by ID (with caching)
 */
export async function loadFont(fontId: FontId): Promise<opentype.Font> {
  // Return cached font if available
  const cached = fontCache.get(fontId);
  if (cached) return cached;

  // Return existing loading promise if in progress
  const loading = loadingPromises.get(fontId);
  if (loading) return loading;

  // Start loading
  const config = getFontConfig(fontId);
  if (!config) {
    throw new Error(`Unknown font ID: ${fontId}`);
  }

  const promise = loadFontFromUrl(config.url);
  loadingPromises.set(fontId, promise);

  try {
    const font = await promise;
    fontCache.set(fontId, font);
    loadingPromises.delete(fontId);
    return font;
  } catch (error) {
    loadingPromises.delete(fontId);
    console.warn(`Font ${fontId} not available, using fallback`);
    throw error;
  }
}

/**
 * Load font from URL
 */
async function loadFontFromUrl(url: string): Promise<opentype.Font> {
  if (typeof window === 'undefined') {
    throw new Error('Font loading requires browser environment');
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch font: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const font = opentype.parse(arrayBuffer);

    if (!font) {
      throw new Error('Failed to parse font');
    }

    return font;
  } catch (error) {
    console.error(`Error loading font from ${url}:`, error);
    throw error;
  }
}

/**
 * Preload all fonts
 */
export async function preloadAllFonts(): Promise<void> {
  await Promise.all(FONTS.map(f => loadFont(f.id)));
}

/**
 * Check if a font is loaded
 */
export function isFontLoaded(fontId: FontId): boolean {
  return fontCache.has(fontId);
}

/**
 * Get list of available fonts
 */
export function getAvailableFonts(): FontConfig[] {
  return [...FONTS];
}

/**
 * Register a font dynamically
 */
export function registerFont(filename: string): void {
  const id = filename.replace(/\.(ttf|otf)$/i, '');
  const label = id.replace(/[-_]/g, ' ');
  const url = `/fonts/keychain/${filename}`;
  
  if (!FONTS.find(f => f.id === id)) {
    FONTS.push({ id, label, url });
  }
}

/**
 * Load font by filename directly
 */
export async function loadFontByFilename(filename: string): Promise<opentype.Font> {
  const id = filename.replace(/\.(ttf|otf)$/i, '');
  registerFont(filename);
  return loadFont(id);
}

/**
 * Clear font cache (for testing/memory management)
 */
export function clearFontCache(): void {
  fontCache.clear();
  loadingPromises.clear();
}

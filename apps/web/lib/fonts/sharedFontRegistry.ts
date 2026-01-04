/**
 * Shared Font Registry
 * Used by Keychain Hub and Personalised Sign Generator V3 PRO
 * Centralizes font loading and text-to-path conversion using opentype.js
 */

import opentype from 'opentype.js';

const PX_PER_MM = 3.7795275591; // 96 DPI

// Font identifiers
export type FontId = string;

// Font configuration
export interface FontConfig {
  id: FontId;
  label: string;
  url: string;
  category?: 'script' | 'serif' | 'sans' | 'display' | 'handwritten';
}

// Available fonts - loaded from keychain folder (shared)
export const FONT_LIST: string[] = [
  "Absolute.ttf",
  "Agatha.ttf",
  "Almonde.ttf",
  "Amastay.ttf",
  "Amelissa Partis.ttf",
  "Angelin Calligraphy 2.ttf",
  "Angelina Bold.ttf",
  "Arsegtosia Script 1.ttf",
  "Ashley Marie.ttf",
  "Astoria.ttf",
  "Baby Boho.ttf",
  "Barbie Script.ttf",
  "Basthiyan Script.ttf",
  "Birthday.ttf",
  "Black Vintage Script 1.ttf",
  "Boho.ttf",
  "Bristol Script.ttf",
  "Calestine.ttf",
  "Chocolates.ttf",
  "Delighter.ttf",
  "Family Script.ttf",
  "Flondayscript Bold.ttf",
  "Flondayscript Regular.ttf",
  "Handwriting.ttf",
  "Heart Style.ttf",
  "Heartbeat.ttf",
  "Hello Mother 1.ttf",
  "Kingdom.ttf",
  "Lustia Script.ttf",
  "Masterline Script.ttf",
  "Milkshake.ttf",
  "Mother Father Script.ttf",
  "My Love Script.ttf",
  "Samantha Script.ttf",
  "Santiago.ttf",
  "Saturday.ttf",
  "September Script.ttf",
  "Shella Script.ttf",
  "Simple Signature.ttf",
  "Splashed.ttf",
  "Stylish Calligraphy.ttf",
  "Sweet Honey.ttf",
  "The Family Calligraphy Script 1.ttf",
  "Welcome.ttf",
];

// Build FONTS array from list
export const FONTS: FontConfig[] = FONT_LIST.map(filename => {
  const id = filename.replace('.ttf', '');
  const label = id.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
  const url = `/fonts/keychain/${encodeURIComponent(filename)}`;
  return { id, label, url };
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
 * Get font config by ID with fallback to first font
 */
export function getFontConfigSafe(fontId: FontId): FontConfig {
  return getFontConfig(fontId) || FONTS[0];
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
    console.warn(`Font ${fontId} not available, trying fallback`);
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
 * Clear font cache
 */
export function clearFontCache(): void {
  fontCache.clear();
  loadingPromises.clear();
}

/**
 * Convert text to SVG path using opentype.js
 */
export function textToPathD(
  font: opentype.Font,
  text: string,
  sizeMm: number,
  letterSpacingMm: number = 0
): { pathD: string; width: number; height: number; bbox: { x: number; y: number; width: number; height: number } } {
  if (!text || text.length === 0) {
    return { pathD: '', width: 0, height: 0, bbox: { x: 0, y: 0, width: 0, height: 0 } };
  }

  const sizePx = sizeMm * PX_PER_MM;
  const letterSpacingPx = letterSpacingMm * PX_PER_MM;

  // Get path at origin (in px)
  const path = font.getPath(text, 0, 0, sizePx);

  // Get bounding box
  if (letterSpacingPx > 0 && text.length > 1) {
    // opentype.js doesn't support letterSpacing on getPath reliably.
    // Keep geometry stable; letter spacing is handled by layout elsewhere.
  }

  const bbox = path.getBoundingBox();
  const bboxMm = {
    x: bbox.x1 / PX_PER_MM,
    y: bbox.y1 / PX_PER_MM,
    width: (bbox.x2 - bbox.x1) / PX_PER_MM,
    height: (bbox.y2 - bbox.y1) / PX_PER_MM,
  };
  const width = bboxMm.width;
  const height = bboxMm.height;

  // Convert to SVG path string and scale to mm
  const pathDpx = path.toPathData(3);
  const pathDmm = scalePathData(pathDpx, 1 / PX_PER_MM);

  return { pathD: pathDmm, width, height, bbox: bboxMm };
}

/**
 * Measure text width without converting to path (faster)
 */
export function measureTextWidth(
  font: opentype.Font,
  text: string,
  sizeMm: number,
  letterSpacingMm: number = 0
): number {
  if (!text || text.length === 0) return 0;

  const sizePx = sizeMm * PX_PER_MM;
  const path = font.getPath(text, 0, 0, sizePx);
  const bbox = path.getBoundingBox();
  const widthMm = (bbox.x2 - bbox.x1) / PX_PER_MM;

  if (letterSpacingMm !== 0 && text.length > 1) {
    return widthMm + (text.length - 1) * letterSpacingMm;
  }

  return widthMm;
}

function scalePathData(pathData: string, scale: number): string {
  return pathData.replace(/-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g, (match) => {
    const num = parseFloat(match);
    if (isNaN(num)) return match;
    return (num * scale).toFixed(3);
  });
}

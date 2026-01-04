/**
 * Keychain Hub V2 - Icon Library
 * 80+ curated icons organized by category + My Icons (localStorage)
 */

import type { IconDef } from '../types';
import { ICON_PACK_V2, ICON_CATEGORIES_V2, getIconByIdV2, getIconsByCategoryV2, searchIconsV2, ICON_COUNT } from './iconPackV2';
import { getMyIcons, getMyIconById, isMyIcon, type MyIcon } from './myIconsStorage';

// Re-export V2 pack as primary
export const ICON_PACK = ICON_PACK_V2;
export const ICON_CATEGORIES = ICON_CATEGORIES_V2;
export { ICON_COUNT };

/**
 * Convert MyIcon to IconDef format
 */
function myIconToIconDef(myIcon: MyIcon): IconDef {
  return {
    id: myIcon.id,
    name: myIcon.name,
    category: myIcon.source === 'ai' ? 'ai-generated' : 'uploaded',
    viewBox: '0 0 100 100',
    paths: myIcon.paths,
  };
}

/**
 * Get all icons (pack + my icons)
 */
export function getAllIcons(): IconDef[] {
  const myIcons = getMyIcons().map(myIconToIconDef);
  return [...myIcons, ...ICON_PACK];
}

/**
 * Get icon by ID (checks both pack and my icons)
 */
export function getAnyIconById(id: string): IconDef | null {
  // Check my icons first
  if (isMyIcon(id)) {
    const myIcon = getMyIconById(id);
    if (myIcon) return myIconToIconDef(myIcon);
  }
  
  // Check pack
  return getIconById(id);
}

// Legacy built-in icon pack (kept for compatibility)
export const LEGACY_ICON_PACK: IconDef[] = [
  // Gaming
  {
    id: 'gamepad',
    name: 'Gamepad',
    category: 'gaming',
    viewBox: '0 0 100 100',
    paths: ['M20 35 Q10 35 10 50 Q10 65 20 65 L35 65 L35 75 L45 75 L45 65 L55 65 L55 75 L65 75 L65 65 L80 65 Q90 65 90 50 Q90 35 80 35 L65 35 L65 45 L35 45 L35 35 Z M25 45 L25 55 L35 55 L35 45 Z M65 45 L75 45 L75 55 L65 55 Z'],
  },
  {
    id: 'controller',
    name: 'Controller',
    category: 'gaming',
    viewBox: '0 0 100 100',
    paths: ['M15 40 Q5 40 5 55 Q5 70 15 70 L40 70 Q45 70 50 65 Q55 70 60 70 L85 70 Q95 70 95 55 Q95 40 85 40 L60 40 Q55 40 50 45 Q45 40 40 40 Z M25 48 L25 58 M20 53 L30 53 M70 48 A3 3 0 1 1 70 54 A3 3 0 1 1 70 48'],
  },
  // Nature
  {
    id: 'heart',
    name: 'Heart',
    category: 'nature',
    viewBox: '0 0 100 100',
    paths: ['M50 85 Q20 60 15 45 Q10 25 30 20 Q45 18 50 35 Q55 18 70 20 Q90 25 85 45 Q80 60 50 85 Z'],
  },
  {
    id: 'star',
    name: 'Star',
    category: 'nature',
    viewBox: '0 0 100 100',
    paths: ['M50 10 L58 38 L88 38 L64 56 L74 85 L50 68 L26 85 L36 56 L12 38 L42 38 Z'],
  },
  {
    id: 'sun',
    name: 'Sun',
    category: 'nature',
    viewBox: '0 0 100 100',
    paths: ['M50 30 A20 20 0 1 1 50 70 A20 20 0 1 1 50 30 M50 5 L50 15 M50 85 L50 95 M5 50 L15 50 M85 50 L95 50 M18 18 L25 25 M75 75 L82 82 M82 18 L75 25 M25 75 L18 82'],
  },
  {
    id: 'moon',
    name: 'Moon',
    category: 'nature',
    viewBox: '0 0 100 100',
    paths: ['M60 15 Q30 20 25 50 Q20 80 50 85 Q70 87 80 70 Q60 75 50 60 Q45 45 60 15 Z'],
  },
  {
    id: 'flower',
    name: 'Flower',
    category: 'nature',
    viewBox: '0 0 100 100',
    paths: ['M50 35 A12 12 0 1 1 50 59 A12 12 0 1 1 50 35 M50 20 Q60 5 70 20 Q80 35 65 40 M65 40 Q85 40 85 55 Q80 70 65 60 M65 60 Q75 80 60 85 Q45 85 50 65 M50 65 Q35 85 20 75 Q15 60 35 55 M35 55 Q15 50 20 35 Q30 20 50 30'],
  },
  {
    id: 'tree',
    name: 'Tree',
    category: 'nature',
    viewBox: '0 0 100 100',
    paths: ['M50 10 L75 50 L60 50 L80 75 L55 75 L55 95 L45 95 L45 75 L20 75 L40 50 L25 50 Z'],
  },
  {
    id: 'leaf',
    name: 'Leaf',
    category: 'nature',
    viewBox: '0 0 100 100',
    paths: ['M20 80 Q10 50 30 30 Q50 10 80 20 Q70 50 50 70 Q30 90 20 80 Z M25 75 Q40 50 70 25'],
  },
  // Animals
  {
    id: 'paw',
    name: 'Paw',
    category: 'animals',
    viewBox: '0 0 100 100',
    paths: ['M50 55 Q30 55 25 70 Q20 85 35 90 Q50 95 65 90 Q80 85 75 70 Q70 55 50 55 Z M30 35 A8 8 0 1 1 30 51 A8 8 0 1 1 30 35 M70 35 A8 8 0 1 1 70 51 A8 8 0 1 1 70 35 M20 50 A6 6 0 1 1 20 62 A6 6 0 1 1 20 50 M80 50 A6 6 0 1 1 80 62 A6 6 0 1 1 80 50'],
  },
  {
    id: 'cat',
    name: 'Cat',
    category: 'animals',
    viewBox: '0 0 100 100',
    paths: ['M20 20 L20 50 Q20 80 50 80 Q80 80 80 50 L80 20 L60 40 L40 40 Z M35 55 A5 5 0 1 1 35 65 A5 5 0 1 1 35 55 M65 55 A5 5 0 1 1 65 65 A5 5 0 1 1 65 55'],
  },
  {
    id: 'dog',
    name: 'Dog',
    category: 'animals',
    viewBox: '0 0 100 100',
    paths: ['M25 25 Q15 25 15 40 L15 70 Q15 85 30 85 L70 85 Q85 85 85 70 L85 40 Q85 25 75 25 L60 25 L55 15 L45 15 L40 25 Z M35 50 A5 5 0 1 1 35 60 A5 5 0 1 1 35 50 M65 50 A5 5 0 1 1 65 60 A5 5 0 1 1 65 50 M45 70 L55 70'],
  },
  {
    id: 'butterfly',
    name: 'Butterfly',
    category: 'animals',
    viewBox: '0 0 100 100',
    paths: ['M50 20 L50 80 M50 30 Q20 10 15 40 Q10 70 40 60 Q50 55 50 50 Q50 55 60 60 Q90 70 85 40 Q80 10 50 30'],
  },
  // Symbols
  {
    id: 'music',
    name: 'Music Note',
    category: 'symbols',
    viewBox: '0 0 100 100',
    paths: ['M70 15 L70 65 Q70 80 55 80 Q40 80 40 65 Q40 50 55 50 Q60 50 65 55 L65 25 L35 35 L35 75 Q35 90 20 90 Q5 90 5 75 Q5 60 20 60 Q25 60 30 65 L30 20 Z'],
  },
  {
    id: 'lightning',
    name: 'Lightning',
    category: 'symbols',
    viewBox: '0 0 100 100',
    paths: ['M60 5 L25 50 L45 50 L35 95 L75 45 L55 45 Z'],
  },
  {
    id: 'diamond',
    name: 'Diamond',
    category: 'symbols',
    viewBox: '0 0 100 100',
    paths: ['M50 5 L90 35 L50 95 L10 35 Z M10 35 L90 35'],
  },
  {
    id: 'crown',
    name: 'Crown',
    category: 'symbols',
    viewBox: '0 0 100 100',
    paths: ['M10 75 L10 35 L30 50 L50 25 L70 50 L90 35 L90 75 Z M15 80 L85 80 L85 90 L15 90 Z'],
  },
  {
    id: 'anchor',
    name: 'Anchor',
    category: 'symbols',
    viewBox: '0 0 100 100',
    paths: ['M50 25 A10 10 0 1 1 50 45 A10 10 0 1 1 50 25 M50 45 L50 90 M30 90 L70 90 M50 55 L20 55 Q10 55 10 70 Q10 85 25 85 M50 55 L80 55 Q90 55 90 70 Q90 85 75 85'],
  },
  {
    id: 'rocket',
    name: 'Rocket',
    category: 'symbols',
    viewBox: '0 0 100 100',
    paths: ['M50 5 Q70 25 70 55 L70 75 L55 75 L55 95 L45 95 L45 75 L30 75 L30 55 Q30 25 50 5 Z M20 60 L30 50 L30 70 Z M80 60 L70 50 L70 70 Z M50 35 A8 8 0 1 1 50 51 A8 8 0 1 1 50 35'],
  },
  // Sports
  {
    id: 'football',
    name: 'Football',
    category: 'sports',
    viewBox: '0 0 100 100',
    paths: ['M50 15 Q80 15 90 50 Q80 85 50 85 Q20 85 10 50 Q20 15 50 15 Z M30 50 L70 50 M50 25 L50 75 M35 30 L65 70 M35 70 L65 30'],
  },
  {
    id: 'basketball',
    name: 'Basketball',
    category: 'sports',
    viewBox: '0 0 100 100',
    paths: ['M50 10 A40 40 0 1 1 50 90 A40 40 0 1 1 50 10 M10 50 L90 50 M50 10 L50 90 M20 20 Q50 40 80 20 M20 80 Q50 60 80 80'],
  },
  // Home
  {
    id: 'home',
    name: 'Home',
    category: 'home',
    viewBox: '0 0 100 100',
    paths: ['M50 10 L10 45 L20 45 L20 90 L80 90 L80 45 L90 45 Z M40 90 L40 60 L60 60 L60 90'],
  },
  {
    id: 'key',
    name: 'Key',
    category: 'home',
    viewBox: '0 0 100 100',
    paths: ['M30 30 A15 15 0 1 1 30 60 A15 15 0 1 1 30 30 M45 45 L85 45 L85 55 L75 55 L75 65 L65 65 L65 55 L45 55 Z'],
  },
  {
    id: 'coffee',
    name: 'Coffee',
    category: 'home',
    viewBox: '0 0 100 100',
    paths: ['M20 30 L20 80 Q20 90 30 90 L60 90 Q70 90 70 80 L70 30 Z M70 40 L80 40 Q90 40 90 55 Q90 70 80 70 L70 70 M30 20 Q35 10 40 20 M45 20 Q50 10 55 20 M60 20 Q65 10 70 20'],
  },
];

// Legacy icon categories (use ICON_CATEGORIES from V2 pack)
const LEGACY_ICON_CATEGORIES = [
  { id: 'gaming', label: 'Gaming' },
  { id: 'nature', label: 'Nature' },
  { id: 'animals', label: 'Animals' },
  { id: 'symbols', label: 'Symbols' },
  { id: 'sports', label: 'Sports' },
  { id: 'home', label: 'Home' },
];

/**
 * Get icon by ID
 */
export function getIconById(id: string): IconDef | null {
  return ICON_PACK.find(icon => icon.id === id) || null;
}

/**
 * Get icons by category
 */
export function getIconsByCategory(category: string): IconDef[] {
  return ICON_PACK.filter(icon => icon.category === category);
}

/**
 * Search icons by name
 */
export function searchIcons(query: string): IconDef[] {
  const q = query.toLowerCase().trim();
  if (!q) return ICON_PACK;
  return ICON_PACK.filter(icon =>
    icon.name.toLowerCase().includes(q) ||
    icon.category.toLowerCase().includes(q)
  );
}

/**
 * Get icon SVG content
 */
export function getIconSvg(id: string): { paths: string[]; viewBox: string } | null {
  const icon = getIconById(id);
  if (!icon) return null;
  return { paths: icon.paths, viewBox: icon.viewBox };
}

/**
 * Normalize icon to specific size (returns SVG group)
 */
export function normalizeIconToSize(icon: IconDef, sizeMm: number): string {
  // Parse viewBox to get original dimensions
  const vbParts = icon.viewBox.split(' ').map(Number);
  const vbWidth = vbParts[2] || 100;
  const vbHeight = vbParts[3] || 100;

  const scale = sizeMm / Math.max(vbWidth, vbHeight);

  const paths = icon.paths.map(d =>
    `<path d="${d}" fill="none" stroke="#000" stroke-width="0.3" />`
  ).join('\n    ');

  return `<g transform="scale(${scale})">
    ${paths}
  </g>`;
}

/**
 * Get icon as positioned group
 */
export function getIconGroup(
  iconId: string,
  x: number,
  y: number,
  sizeMm: number,
  strokeWidth: number = 0.3
): string {
  const icon = getIconById(iconId);
  if (!icon) return '';

  const vbParts = icon.viewBox.split(' ').map(Number);
  const vbWidth = vbParts[2] || 100;
  const vbHeight = vbParts[3] || 100;

  const scale = sizeMm / Math.max(vbWidth, vbHeight);

  const paths = icon.paths.map(d =>
    `<path d="${d}" fill="none" stroke="#000" stroke-width="${strokeWidth / scale}" />`
  ).join('\n      ');

  return `<g transform="translate(${x}, ${y}) scale(${scale})">
      ${paths}
    </g>`;
}

/**
 * Get icon path data for polygon operations
 * Returns combined path data and viewbox info
 */
export function getIconPathData(iconId: string): { d: string; viewBox: string; width: number; height: number } | null {
  const icon = getAnyIconById(iconId);
  if (!icon) return null;

  // Combine all paths into single d attribute
  const combinedD = icon.paths.join(' ');
  
  const vbParts = icon.viewBox.split(' ').map(Number);
  const width = vbParts[2] || 100;
  const height = vbParts[3] || 100;

  return {
    d: combinedD,
    viewBox: icon.viewBox,
    width,
    height
  };
}

/**
 * Parse uploaded SVG and extract paths
 */
export function parseUploadedIcon(svgContent: string): IconDef | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');

    const svg = doc.querySelector('svg');
    if (!svg) return null;

    const viewBox = svg.getAttribute('viewBox') || '0 0 100 100';

    const paths: string[] = [];
    doc.querySelectorAll('path').forEach(path => {
      const d = path.getAttribute('d');
      if (d) paths.push(d);
    });

    // Also convert circles, rects, etc.
    doc.querySelectorAll('circle').forEach(el => {
      const cx = parseFloat(el.getAttribute('cx') || '0');
      const cy = parseFloat(el.getAttribute('cy') || '0');
      const r = parseFloat(el.getAttribute('r') || '0');
      if (r > 0) {
        paths.push(`M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`);
      }
    });

    if (paths.length === 0) return null;

    return {
      id: `upload-${Date.now()}`,
      name: 'Uploaded Icon',
      category: 'uploads',
      viewBox,
      paths,
    };
  } catch {
    return null;
  }
}

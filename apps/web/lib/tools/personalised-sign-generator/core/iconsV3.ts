/**
 * Personalised Sign Generator V3 - Icon Library
 * Small SVG icons for sign decoration
 */

import type { IconPlacement } from '../types/signV3';

export interface IconDefinition {
  id: string;
  name: string;
  category: 'nature' | 'symbols' | 'animals' | 'home' | 'tools';
  viewBox: string;
  path: string;
}

export const ICON_LIBRARY: IconDefinition[] = [
  // Nature
  { id: 'tree', name: 'Tree', category: 'nature', viewBox: '0 0 24 24', path: 'M12 2L4 14h5v8h6v-8h5L12 2z' },
  { id: 'leaf', name: 'Leaf', category: 'nature', viewBox: '0 0 24 24', path: 'M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z' },
  { id: 'flower', name: 'Flower', category: 'nature', viewBox: '0 0 24 24', path: 'M12 22c4.97 0 9-4.03 9-9-4.97 0-9 4.03-9 9zM5.6 10.25c0 1.38 1.12 2.5 2.5 2.5.53 0 1.01-.16 1.42-.44l-.02.19c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5l-.02-.19c.4.28.89.44 1.42.44 1.38 0 2.5-1.12 2.5-2.5 0-1-.59-1.85-1.43-2.25.84-.4 1.43-1.25 1.43-2.25 0-1.38-1.12-2.5-2.5-2.5-.53 0-1.01.16-1.42.44l.02-.19C14.5 3.62 13.38 2.5 12 2.5S9.5 3.62 9.5 5l.02.19c-.4-.28-.89-.44-1.42-.44-1.38 0-2.5 1.12-2.5 2.5 0 1 .59 1.85 1.43 2.25-.84.4-1.43 1.25-1.43 2.25zM12 5.5c1.38 0 2.5 1.12 2.5 2.5s-1.12 2.5-2.5 2.5S9.5 9.38 9.5 8s1.12-2.5 2.5-2.5zM3 13c0 4.97 4.03 9 9 9 0-4.97-4.03-9-9-9z' },
  { id: 'sun', name: 'Sun', category: 'nature', viewBox: '0 0 24 24', path: 'M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z' },
  { id: 'mountain', name: 'Mountain', category: 'nature', viewBox: '0 0 24 24', path: 'M14 6l-3.75 5 2.85 3.8-1.6 1.2C9.81 13.75 7 10 7 10l-6 8h22L14 6z' },

  // Symbols
  { id: 'heart', name: 'Heart', category: 'symbols', viewBox: '0 0 24 24', path: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z' },
  { id: 'star', name: 'Star', category: 'symbols', viewBox: '0 0 24 24', path: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z' },
  { id: 'diamond', name: 'Diamond', category: 'symbols', viewBox: '0 0 24 24', path: 'M12 2L2 12l10 10 10-10L12 2z' },
  { id: 'infinity', name: 'Infinity', category: 'symbols', viewBox: '0 0 24 24', path: 'M18.6 6.62c-1.44 0-2.8.56-3.77 1.53L12 10.66 10.48 12h.01L7.8 14.39c-.64.64-1.49.99-2.4.99-1.87 0-3.39-1.51-3.39-3.38S3.53 8.62 5.4 8.62c.91 0 1.76.35 2.44 1.03l1.13 1 1.51-1.34L9.22 8.2C8.2 7.18 6.84 6.62 5.4 6.62 2.42 6.62 0 9.04 0 12s2.42 5.38 5.4 5.38c1.44 0 2.8-.56 3.77-1.53l2.83-2.5.01.01L13.52 12h-.01l2.69-2.39c.64-.64 1.49-.99 2.4-.99 1.87 0 3.39 1.51 3.39 3.38s-1.52 3.38-3.39 3.38c-.9 0-1.76-.35-2.44-1.03l-1.14-1.01-1.51 1.34 1.27 1.12c1.02 1.01 2.37 1.57 3.82 1.57 2.98 0 5.4-2.41 5.4-5.38s-2.42-5.37-5.4-5.37z' },
  { id: 'crown', name: 'Crown', category: 'symbols', viewBox: '0 0 24 24', path: 'M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z' },
  { id: 'anchor', name: 'Anchor', category: 'symbols', viewBox: '0 0 24 24', path: 'M17 15l2-2-2-2-1.4 1.4.6.6H13v-6h2V5h-2V3h-2v2H9v2h2v6H7.8l.6-.6L7 11l-2 2 2 2 1.4-1.4-.6-.6H11v6c-2.2-.5-4-2.5-4-4.9H5c0 3.5 2.9 6.5 6.5 6.9V23h1v-2c3.6-.4 6.5-3.4 6.5-6.9h-2c0 2.4-1.8 4.4-4 4.9v-6h3.2l-.6.6L17 15z' },

  // Animals
  { id: 'paw', name: 'Paw', category: 'animals', viewBox: '0 0 24 24', path: 'M4.5 9.5C5.88 9.5 7 10.62 7 12s-1.12 2.5-2.5 2.5S2 13.38 2 12s1.12-2.5 2.5-2.5zm15 0c1.38 0 2.5 1.12 2.5 2.5s-1.12 2.5-2.5 2.5S17 13.38 17 12s1.12-2.5 2.5-2.5zm-7.5-5C13.38 4.5 14.5 5.62 14.5 7S13.38 9.5 12 9.5 9.5 8.38 9.5 7 10.62 4.5 12 4.5zm0 10.5c2.21 0 4 1.79 4 4v1H8v-1c0-2.21 1.79-4 4-4zm-5-8c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm10 0c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z' },
  { id: 'bird', name: 'Bird', category: 'animals', viewBox: '0 0 24 24', path: 'M23 11.5l-3.05-1.13c-.26-1.15-.91-2.17-1.82-2.89l.34-1.81-1.53.6c-.89-.29-1.85-.35-2.77-.14L12 4l1.83 2.13c-.22.27-.41.56-.57.87L9 7l2.09 2.09c-.09.47-.09.96 0 1.44L9 12.62l4.26.01c.16.31.35.6.57.87L12 15.63l2.17-2.13c.92.21 1.88.15 2.77-.14l1.53.6-.34-1.81c.91-.72 1.56-1.74 1.82-2.89L23 11.5z' },
  { id: 'fish', name: 'Fish', category: 'animals', viewBox: '0 0 24 24', path: 'M12 20L10 22h4l-2-2zm6-3c-1.29 0-2.48.36-3.5.98V12c0-2.76-2.24-5-5-5s-5 2.24-5 5 2.24 5 5 5c.83 0 1.61-.21 2.3-.57.48.88 1.25 1.58 2.2 2.02V17c0-.55.45-1 1-1s1 .45 1 1v1.45c.95-.44 1.72-1.14 2.2-2.02.69.36 1.47.57 2.3.57v-2c-1.29 0-2.48.36-3.5.98V12h2v5h1v-5h2c0-2.76-2.24-5-5-5H9.5c-2.76 0-5 2.24-5 5s2.24 5 5 5H12v.43c1.02-.62 2.21-.98 3.5-.98V17h1v-5z' },

  // Home
  { id: 'home', name: 'Home', category: 'home', viewBox: '0 0 24 24', path: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z' },
  { id: 'door', name: 'Door', category: 'home', viewBox: '0 0 24 24', path: 'M19 19V5c0-1.1-.9-2-2-2H7c-1.1 0-2 .9-2 2v14H3v2h18v-2h-2zm-8-6H9v-2h2v2z' },
  { id: 'key', name: 'Key', category: 'home', viewBox: '0 0 24 24', path: 'M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z' },

  // Tools
  { id: 'hammer', name: 'Hammer', category: 'tools', viewBox: '0 0 24 24', path: 'M2 19.63l1.41 1.41 7.07-7.07-1.41-1.41L2 19.63zm14.54-9.19l2.83-2.83-1.41-1.41-2.83 2.83 1.41 1.41zM19.07 3.51l1.41 1.41-3.54 3.54-1.41-1.41 3.54-3.54zm-7.07 7.07l-3.54-3.54L6.34 9.17l3.54 3.54 2.12-2.13z' },
  { id: 'wrench', name: 'Wrench', category: 'tools', viewBox: '0 0 24 24', path: 'M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z' },
  { id: 'gear', name: 'Gear', category: 'tools', viewBox: '0 0 24 24', path: 'M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z' },
];

export function getIconById(id: string): IconDefinition | null {
  return ICON_LIBRARY.find((icon) => icon.id === id) || null;
}

export function getIconsByCategory(category: IconDefinition['category']): IconDefinition[] {
  return ICON_LIBRARY.filter((icon) => icon.category === category);
}

export function getIconSvg(iconId: string, size: number, strokeWidth: number = 0.1): string {
  const icon = getIconById(iconId);
  if (!icon) return '';

  return `<svg width="${size}" height="${size}" viewBox="${icon.viewBox}">
    <path d="${icon.path}" fill="none" stroke="#000" stroke-width="${strokeWidth * 24}" />
  </svg>`;
}

export function getIconPathElement(iconId: string, x: number, y: number, size: number, strokeWidth: number = 0.1): string {
  const icon = getIconById(iconId);
  if (!icon) return '';

  const [, , vbW, vbH] = icon.viewBox.split(' ').map(Number);
  const scale = size / Math.max(vbW, vbH);

  return `<g transform="translate(${x - size / 2}, ${y - size / 2}) scale(${scale})">
    <path d="${icon.path}" fill="none" stroke="#000" stroke-width="${strokeWidth / scale}" />
  </g>`;
}

export function calculateIconPosition(
  placement: IconPlacement,
  centerX: number,
  line2Y: number,
  line1Y: number | undefined,
  iconSize: number,
  textWidth: number
): { x: number; y: number } {
  const halfSize = iconSize / 2;
  const gap = 8;

  switch (placement) {
    case 'left-of-line2':
      return { x: centerX - textWidth / 2 - halfSize - gap, y: line2Y };
    case 'right-of-line2':
      return { x: centerX + textWidth / 2 + halfSize + gap, y: line2Y };
    case 'above-line2':
      return { x: centerX, y: line2Y - iconSize - gap };
    case 'between-lines':
      if (line1Y !== undefined) {
        return { x: centerX, y: (line1Y + line2Y) / 2 };
      }
      return { x: centerX, y: line2Y - iconSize - gap };
    default:
      return { x: centerX, y: line2Y };
  }
}

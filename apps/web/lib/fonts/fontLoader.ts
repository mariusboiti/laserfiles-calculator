import { getFontConfig } from './sharedFontRegistry';

const injectedFontIds = new Set<string>();

function ensureFontFaceInjected(fontId: string): void {
  if (typeof document === 'undefined') return;
  if (!fontId) return;
  if (injectedFontIds.has(fontId)) return;

  const config = getFontConfig(fontId);
  if (!config) return;

  const styleId = `lfp-fontface-${fontId}`;
  if (document.getElementById(styleId)) {
    injectedFontIds.add(fontId);
    return;
  }

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `@font-face{font-family:"${fontId}";src:url("${config.url}") format("truetype");font-display:swap;}`;
  document.head.appendChild(style);
  injectedFontIds.add(fontId);
}

export async function ensureFontsLoaded(fontIds: string[]): Promise<void> {
  for (const id of fontIds) {
    ensureFontFaceInjected(id);
  }
}

export function getCssFontFamily(fontId: string): string {
  if (!fontId) return 'Arial, sans-serif';
  return `"${fontId}", Arial, sans-serif`;
}

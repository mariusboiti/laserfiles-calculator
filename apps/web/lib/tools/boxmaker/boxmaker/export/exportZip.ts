/**
 * Export all panels as ZIP file
 * Standardized naming for BoxMaker exports
 */

import JSZip from 'jszip';
import type { BoxType, HingedBoxSvgs, SlidingDrawerSvgs } from '../core/types';

/**
 * Generate standardized ZIP filename
 * Format: boxmaker-{mode}-{w}x{d}x{h}-t{thickness}-kerf{kerf}.zip
 */
export function generateZipFilename(
  mode: BoxType,
  widthMm: number,
  depthMm: number,
  heightMm: number,
  thicknessMm: number,
  kerfMm: number
): string {
  const modeSlug = mode === 'sliding_drawer' ? 'sliding-drawer' : mode;
  const kerfStr = kerfMm.toFixed(2).replace('.', 'p');
  return `boxmaker-${modeSlug}-${widthMm}x${depthMm}x${heightMm}-t${thicknessMm}-kerf${kerfStr}.zip`;
}

/**
 * Generate panel filename
 * Format: boxmaker-{mode}-{panel}.svg
 */
export function generatePanelFilename(mode: BoxType, panelName: string): string {
  const modeSlug = mode === 'sliding_drawer' ? 'sliding-drawer' : mode;
  return `boxmaker-${modeSlug}-${panelName}.svg`;
}

export async function exportSimpleBoxZip(
  panels: { name: string; svg: string }[],
  widthMm: number,
  depthMm: number,
  heightMm: number,
  thicknessMm: number,
  kerfMm: number
): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder('boxmaker/simple');
  if (!folder) return;

  for (const p of panels) {
    const filename = generatePanelFilename('simple', p.name);
    folder.file(filename, p.svg);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const zipFilename = generateZipFilename('simple', widthMm, depthMm, heightMm, thicknessMm, kerfMm);

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = zipFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export hinged box panels as ZIP
 */
export async function exportHingedBoxZip(
  svgs: HingedBoxSvgs,
  widthMm: number,
  depthMm: number,
  heightMm: number,
  thicknessMm: number,
  kerfMm: number
): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder('boxmaker/hinged');
  
  if (!folder) return;

  // Add all panels
  const panels: (keyof HingedBoxSvgs)[] = ['front', 'back', 'left', 'right', 'bottom', 'lid'];
  
  for (const panel of panels) {
    const filename = generatePanelFilename('hinged', panel);
    folder.file(filename, svgs[panel]);
  }

  // Generate ZIP
  const blob = await zip.generateAsync({ type: 'blob' });
  const zipFilename = generateZipFilename('hinged', widthMm, depthMm, heightMm, thicknessMm, kerfMm);
  
  // Download
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = zipFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export sliding drawer box panels as ZIP
 */
export async function exportSlidingDrawerZip(
  svgs: SlidingDrawerSvgs,
  widthMm: number,
  depthMm: number,
  heightMm: number,
  thicknessMm: number,
  kerfMm: number
): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder('boxmaker/sliding-drawer');
  
  if (!folder) return;

  // Add outer panels
  const outerPanels: (keyof typeof svgs.outer)[] = ['back', 'left', 'right', 'bottom'];
  for (const panel of outerPanels) {
    const filename = generatePanelFilename('sliding_drawer', `outer-${panel}`);
    const svg = svgs.outer[panel];
    if (svg) folder.file(filename, svg);
  }
  
  if (svgs.outer.top) {
    const filename = generatePanelFilename('sliding_drawer', 'outer-top');
    folder.file(filename, svgs.outer.top);
  }

  // Add drawer panels
  const drawerPanels: (keyof typeof svgs.drawer)[] = ['front', 'back', 'left', 'right', 'bottom'];
  for (const panel of drawerPanels) {
    const filename = generatePanelFilename('sliding_drawer', `drawer-${panel}`);
    const svg = svgs.drawer[panel];
    if (svg) folder.file(filename, svg);
  }

  // Add front face if exists
  if (svgs.frontFace) {
    const filename = generatePanelFilename('sliding_drawer', 'frontface');
    folder.file(filename, svgs.frontFace);
  }

  // Generate ZIP
  const blob = await zip.generateAsync({ type: 'blob' });
  const zipFilename = generateZipFilename('sliding_drawer', widthMm, depthMm, heightMm, thicknessMm, kerfMm);
  
  // Download
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = zipFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

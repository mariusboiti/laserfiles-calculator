import { BoxType } from './types';

/**
 * Generate standardized export filename for BoxMaker
 * Pattern: boxmaker_<mode>_<timestamp>.svg
 */
export function generateExportFilename(
  boxType: BoxType,
  panelName?: string,
  includeTimestamp = false
): string {
  const modeSlug = boxType === BoxType.slidingDrawer ? 'sliding-drawer' : boxType;
  const timestamp = includeTimestamp ? `_${Date.now()}` : '';
  const panel = panelName ? `_${panelName}` : '';
  
  return `boxmaker_${modeSlug}${panel}${timestamp}.svg`;
}

/**
 * Generate filename for all panels export (ZIP)
 */
export function generateAllPanelsFilename(
  boxType: BoxType,
  includeTimestamp = false
): string {
  const modeSlug = boxType === BoxType.slidingDrawer ? 'sliding-drawer' : boxType;
  const timestamp = includeTimestamp ? `_${Date.now()}` : '';
  
  return `boxmaker_${modeSlug}_all${timestamp}.zip`;
}

/**
 * Sanitize panel name for use in filename
 */
export function sanitizePanelName(panelName: string): string {
  return panelName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

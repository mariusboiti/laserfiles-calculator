/**
 * ZIP Export for Ornament Layout Planner V2
 * Creates ZIP archive with all sheets + manifest
 */

import JSZip from 'jszip';
import type { SheetLayout, TemplateItem, LayoutSettings } from '../types/layout';
import { generateSheetSvg, generateManifest } from './exportSvg';

export interface ZipExportOptions {
  sheets: SheetLayout[];
  templates: TemplateItem[];
  settings: LayoutSettings;
}

/**
 * Generate ZIP file with all sheets and manifest
 */
export async function generateZipExport(options: ZipExportOptions): Promise<Blob> {
  const { sheets, templates, settings } = options;
  const zip = new JSZip();

  // Create sheets folder
  const sheetsFolder = zip.folder('sheets');
  if (!sheetsFolder) {
    throw new Error('Failed to create sheets folder in ZIP');
  }

  // Add each sheet SVG
  for (const sheet of sheets) {
    const svg = generateSheetSvg({
      sheetIndex: sheet.sheetIndex,
      sheet,
      templates,
      settings,
    });

    const filename = `sheet-${sheet.sheetIndex.toString().padStart(2, '0')}.svg`;
    sheetsFolder.file(filename, svg);
  }

  // Add manifest.json
  const manifest = generateManifest(sheets, templates, settings);
  zip.file('manifest.json', manifest);

  // Generate ZIP blob
  const blob = await zip.generateAsync({ type: 'blob' });
  return blob;
}

/**
 * Download ZIP file
 */
export function downloadZip(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

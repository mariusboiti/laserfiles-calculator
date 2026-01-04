/**
 * Unified Export Naming
 * Consistent file naming across all tools and artifacts
 */

export interface ExportNameParams {
  toolSlug: string;
  name?: string;
  widthMm?: number;
  heightMm?: number;
  ext: string;
}

/**
 * Generate a safe filename string
 */
function safeFilename(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 50);
}

/**
 * Build export filename
 * Format: <toolSlug>_<safeName?>_<width>x<height>mm_<YYYY-MM-DD>.<ext>
 */
export function buildExportName(params: ExportNameParams): string {
  const { toolSlug, name, widthMm, heightMm, ext } = params;

  const parts: string[] = [safeFilename(toolSlug)];

  if (name) {
    parts.push(safeFilename(name));
  }

  if (widthMm !== undefined && heightMm !== undefined) {
    parts.push(`${Math.round(widthMm)}x${Math.round(heightMm)}mm`);
  }

  const date = new Date().toISOString().slice(0, 10);
  parts.push(date);

  const filename = parts.join('_');
  const extension = ext.startsWith('.') ? ext : `.${ext}`;

  return `${filename}${extension}`;
}

/**
 * Build artifact file key for storage
 */
export function buildArtifactKey(params: {
  userId: string;
  artifactId: string;
  toolSlug: string;
  ext: string;
}): string {
  const { userId, artifactId, toolSlug, ext } = params;
  const safeExt = ext.startsWith('.') ? ext.slice(1) : ext;
  return `artifacts/${userId}/${artifactId}/${toolSlug}_design.${safeExt}`;
}

/**
 * Extract dimensions from filename if present
 */
export function parseDimensionsFromName(filename: string): { widthMm: number; heightMm: number } | null {
  const match = filename.match(/(\d+)x(\d+)mm/i);
  if (!match) return null;

  const width = parseInt(match[1], 10);
  const height = parseInt(match[2], 10);

  if (isNaN(width) || isNaN(height)) return null;

  return { widthMm: width, heightMm: height };
}

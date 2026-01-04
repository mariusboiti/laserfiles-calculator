/**
 * Sanitize traced path strings coming from Potrace.
 *
 * The trace API returns path data only (no SVG markup). This helper ensures we only
 * keep safe path data and provides a basic complexity estimate.
 */

export type SanitizeTracedPathsResult = {
  paths: string[];
  warnings: string[];
  commandCount: number;
};

const ALLOWED_PATH_CHARS = /^[0-9eE.,\s+\-MLHVCSQTAZmlhvcsqtaz]+$/;

function countCommandsInPathD(d: string): number {
  return (d.match(/[MLHVCSQTAZmlhvcsqtaz]/g) || []).length;
}

export function sanitizeTracedPaths(paths: string[]): SanitizeTracedPathsResult {
  const warnings: string[] = [];

  const cleaned: string[] = [];
  let commandCount = 0;

  for (const raw of paths || []) {
    const d = String(raw || '').trim();
    if (!d) continue;

    if (d.includes('<') || d.includes('>') || d.includes('NaN') || d.includes('Infinity')) {
      warnings.push('Removed unsafe path data');
      continue;
    }

    if (!ALLOWED_PATH_CHARS.test(d)) {
      warnings.push('Removed path with unsupported characters');
      continue;
    }

    const cmds = countCommandsInPathD(d);
    commandCount += cmds;
    cleaned.push(d);
  }

  if (cleaned.length === 0) {
    warnings.push('Trace produced no usable vector paths');
  }

  if (commandCount > 8000) {
    warnings.push(`Trace is complex (${commandCount} path commands). Consider increasing simplify tolerance.`);
  }

  return { paths: cleaned, warnings, commandCount };
}

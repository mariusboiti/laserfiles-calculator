/**
 * SVG Import Validation & Guardrails
 * Validates SVG files before import and warns about complexity
 */

// ============================================================================
// Configuration
// ============================================================================

export const SVG_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const SVG_WARNING_SIZE_BYTES = 2 * 1024 * 1024; // 2MB - show warning
export const SVG_MAX_ELEMENTS = 50000; // Max elements before warning
export const SVG_WARNING_ELEMENTS = 10000; // Show warning above this

// ============================================================================
// Types
// ============================================================================

export interface SVGValidationResult {
  valid: boolean;
  error?: string;
  warnings: string[];
  stats: {
    sizeBytes: number;
    elementCount: number;
    pathCount: number;
    hasText: boolean;
    hasImages: boolean;
    hasForeignObjects: boolean;
  };
}

export interface SVGValidationOptions {
  maxSizeBytes?: number;
  maxElements?: number;
  allowText?: boolean;
  allowImages?: boolean;
  allowForeignObjects?: boolean;
}

// ============================================================================
// File Type Validation
// ============================================================================

export function isValidSVGFile(file: File): boolean {
  const validTypes = ['image/svg+xml', 'application/svg+xml'];
  const validExtension = file.name.toLowerCase().endsWith('.svg');
  
  return validTypes.includes(file.type) || validExtension;
}

// ============================================================================
// Main Validation Function
// ============================================================================

export async function validateSVG(
  input: File | string,
  options: SVGValidationOptions = {}
): Promise<SVGValidationResult> {
  const {
    maxSizeBytes = SVG_MAX_SIZE_BYTES,
    maxElements = SVG_MAX_ELEMENTS,
    allowText = true,
    allowImages = true,
    allowForeignObjects = false,
  } = options;

  const warnings: string[] = [];
  let svgString: string;
  let sizeBytes: number;

  // Get SVG content
  if (typeof input === 'string') {
    svgString = input;
    sizeBytes = new Blob([input]).size;
  } else {
    // File type check
    if (!isValidSVGFile(input)) {
      return {
        valid: false,
        error: 'This file is not a valid SVG. Please select an SVG file.',
        warnings: [],
        stats: createEmptyStats(),
      };
    }

    sizeBytes = input.size;

    // Size check before reading
    if (sizeBytes > maxSizeBytes) {
      return {
        valid: false,
        error: `This SVG is too large (${formatBytes(sizeBytes)}). Maximum size is ${formatBytes(maxSizeBytes)}.`,
        warnings: [],
        stats: { ...createEmptyStats(), sizeBytes },
      };
    }

    try {
      svgString = await input.text();
    } catch {
      return {
        valid: false,
        error: 'Failed to read the SVG file. Please try a different file.',
        warnings: [],
        stats: createEmptyStats(),
      };
    }
  }

  // Parse SVG
  let doc: Document;
  try {
    const parser = new DOMParser();
    doc = parser.parseFromString(svgString, 'image/svg+xml');
    
    // Check for parsing errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      return {
        valid: false,
        error: "This SVG file can't be parsed. Please try a different file.",
        warnings: [],
        stats: { ...createEmptyStats(), sizeBytes },
      };
    }
  } catch {
    return {
      valid: false,
      error: "This SVG file can't be parsed. Please try a different file.",
      warnings: [],
      stats: { ...createEmptyStats(), sizeBytes },
    };
  }

  // Check for SVG root element
  const svgRoot = doc.querySelector('svg');
  if (!svgRoot) {
    return {
      valid: false,
      error: 'No <svg> element found. Please use a valid SVG file.',
      warnings: [],
      stats: { ...createEmptyStats(), sizeBytes },
    };
  }

  // Count elements
  const allElements = svgRoot.querySelectorAll('*');
  const elementCount = allElements.length;
  const pathCount = svgRoot.querySelectorAll('path, line, polyline, polygon, rect, circle, ellipse').length;
  const hasText = svgRoot.querySelectorAll('text, tspan').length > 0;
  const hasImages = svgRoot.querySelectorAll('image').length > 0;
  const hasForeignObjects = svgRoot.querySelectorAll('foreignObject').length > 0;

  const stats: SVGValidationResult['stats'] = {
    sizeBytes,
    elementCount,
    pathCount,
    hasText,
    hasImages,
    hasForeignObjects,
  };

  // Element count check
  if (elementCount > maxElements) {
    return {
      valid: false,
      error: `This SVG is too complex (${elementCount.toLocaleString()} elements). Maximum is ${maxElements.toLocaleString()} elements.`,
      warnings: [],
      stats,
    };
  }

  // Warnings
  if (sizeBytes > SVG_WARNING_SIZE_BYTES) {
    warnings.push(`This SVG is large (${formatBytes(sizeBytes)}) and may slow down the editor.`);
  }

  if (elementCount > SVG_WARNING_ELEMENTS) {
    warnings.push(`This SVG is complex (${elementCount.toLocaleString()} elements) and may slow down the editor.`);
  }

  if (hasText && !allowText) {
    warnings.push('This SVG contains text elements which may not render correctly. Consider converting text to paths.');
  }

  if (hasImages) {
    if (!allowImages) {
      return {
        valid: false,
        error: 'This SVG contains embedded images which are not supported.',
        warnings: [],
        stats,
      };
    }
    warnings.push('This SVG contains embedded images. They may not export correctly for laser cutting.');
  }

  if (hasForeignObjects) {
    if (!allowForeignObjects) {
      warnings.push('This SVG contains foreign objects which may not render correctly.');
    }
  }

  return {
    valid: true,
    warnings,
    stats,
  };
}

// ============================================================================
// Quick Validation (for drag-drop feedback)
// ============================================================================

export function quickValidateSVGFile(file: File): { valid: boolean; error?: string } {
  if (!isValidSVGFile(file)) {
    return { valid: false, error: 'Please select an SVG file.' };
  }

  if (file.size > SVG_MAX_SIZE_BYTES) {
    return { 
      valid: false, 
      error: `File too large (${formatBytes(file.size)}). Max: ${formatBytes(SVG_MAX_SIZE_BYTES)}.` 
    };
  }

  return { valid: true };
}

// ============================================================================
// Helpers
// ============================================================================

function createEmptyStats(): SVGValidationResult['stats'] {
  return {
    sizeBytes: 0,
    elementCount: 0,
    pathCount: 0,
    hasText: false,
    hasImages: false,
    hasForeignObjects: false,
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ============================================================================
// Complexity Score (for UI feedback)
// ============================================================================

export function getSVGComplexityLevel(stats: SVGValidationResult['stats']): 'low' | 'medium' | 'high' {
  const { elementCount, sizeBytes } = stats;

  if (elementCount > SVG_WARNING_ELEMENTS || sizeBytes > SVG_WARNING_SIZE_BYTES) {
    return 'high';
  }

  if (elementCount > 1000 || sizeBytes > 500 * 1024) {
    return 'medium';
  }

  return 'low';
}

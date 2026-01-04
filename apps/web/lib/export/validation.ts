/**
 * Export Validation Utilities
 * Ensures exports are valid before download
 */

// ============================================================================
// Types
// ============================================================================

export interface ExportValidationResult {
  valid: boolean;
  error?: string;
  warnings: string[];
}

export interface ExportContent {
  svg?: string;
  dxf?: string;
  pdf?: string;
  png?: string;
}

// ============================================================================
// Validation Functions
// ============================================================================

export function validateExportContent(content: ExportContent): ExportValidationResult {
  const warnings: string[] = [];

  // Check if there's anything to export
  const hasContent = content.svg || content.dxf || content.pdf || content.png;
  
  if (!hasContent) {
    return {
      valid: false,
      error: 'Nothing to export yet. Create or import a design first.',
      warnings: [],
    };
  }

  // Validate SVG if present
  if (content.svg) {
    const svgValidation = validateSVGForExport(content.svg);
    if (!svgValidation.valid) {
      return {
        valid: false,
        error: svgValidation.error,
        warnings: [],
      };
    }
    warnings.push(...svgValidation.warnings);
  }

  return {
    valid: true,
    warnings,
  };
}

export function validateSVGForExport(svg: string): ExportValidationResult {
  const warnings: string[] = [];

  // Check for empty SVG
  if (!svg || svg.trim().length === 0) {
    return {
      valid: false,
      error: 'Export content is empty. Please create a design first.',
      warnings: [],
    };
  }

  // Check for SVG root element
  if (!svg.includes('<svg')) {
    return {
      valid: false,
      error: 'Invalid export format. Please try again.',
      warnings: [],
    };
  }

  // Check for actual content (paths, shapes, etc.)
  const hasDrawableContent = 
    svg.includes('<path') ||
    svg.includes('<line') ||
    svg.includes('<rect') ||
    svg.includes('<circle') ||
    svg.includes('<ellipse') ||
    svg.includes('<polygon') ||
    svg.includes('<polyline') ||
    svg.includes('<text');

  if (!hasDrawableContent) {
    return {
      valid: false,
      error: 'The design appears to be empty. Add some elements before exporting.',
      warnings: [],
    };
  }

  // Check for raster images (warning only)
  if (svg.includes('<image')) {
    warnings.push('This export contains embedded images which may not work with laser cutters.');
  }

  // Check for very large content
  const sizeKB = new Blob([svg]).size / 1024;
  if (sizeKB > 5000) {
    warnings.push(`Large export (${Math.round(sizeKB / 1024)}MB) may take longer to process.`);
  }

  return {
    valid: true,
    warnings,
  };
}

// ============================================================================
// Pre-export Checks
// ============================================================================

export interface PreExportCheck {
  canExport: boolean;
  reason?: string;
}

export function checkCanExport(options: {
  hasContent: boolean;
  isProcessing?: boolean;
  hasError?: boolean;
}): PreExportCheck {
  const { hasContent, isProcessing = false, hasError = false } = options;

  if (isProcessing) {
    return {
      canExport: false,
      reason: 'Please wait for processing to complete.',
    };
  }

  if (hasError) {
    return {
      canExport: false,
      reason: 'Please resolve errors before exporting.',
    };
  }

  if (!hasContent) {
    return {
      canExport: false,
      reason: 'Nothing to export yet. Create or import a design first.',
    };
  }

  return { canExport: true };
}

// ============================================================================
// Export Error Messages
// ============================================================================

export function getExportErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Known error types
    if (error.message.includes('timeout')) {
      return 'Export timed out. Please try again with a simpler design.';
    }
    if (error.message.includes('memory')) {
      return 'Export failed due to memory limits. Try a simpler design.';
    }
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'Export failed due to network error. Please check your connection.';
    }
    
    // Generic but user-friendly
    return 'Export failed. Please try again.';
  }
  
  return 'Export failed. Please try again.';
}

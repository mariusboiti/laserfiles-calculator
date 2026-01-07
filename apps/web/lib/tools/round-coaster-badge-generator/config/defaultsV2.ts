/**
 * Round Coaster & Badge Generator V2 - Defaults & Presets
 */

import type { 
  CoasterStateV2, PresetConfig, ShapeType, Warning, 
  BorderConfig, DimensionConfig, CONSTRAINTS 
} from '../types/coasterV2';

// Preset diameters for quick selection
export const PRESET_DIAMETERS = [60, 70, 80, 90, 100] as const;

// Step sizes for numeric inputs
export const STEP_SIZES = [0.5, 1, 2] as const;

// Default state
export const DEFAULTS_V2: CoasterStateV2 = {
  shape: 'circle',
  dimensions: {
    diameter: 90,
    width: 90,
    height: 90,
    lockAspect: true,
    aspectRatio: 1,
  },
  border: {
    enabled: true,
    thickness: 0.4,
    inset: 3,
    doubleBorder: false,
    doubleBorderGap: 1.2,
  },
  text: {
    top: '',
    center: 'COASTER',
    bottom: '',
    uppercase: false,
    fontFamily: 'Arial, Helvetica, sans-serif',
  },
  textFit: {
    autoFit: true,
    manualFontSize: 16,
    fontMin: 8,
    fontMaxCenter: 24,
    fontMaxSmall: 14,
    letterSpacing: 0,
  },
  safeArea: {
    padding: 5,
    showGuide: false,
  },
  preview: {
    zoom: 1,
    showSafeArea: false,
    showLayers: false,
    layerColors: false,
  },
  export: {
    includeDimensions: true,
    includeTimestamp: false,
    includeMetadata: true,
    layerGrouping: true,
  },
};

// Presets
export const PRESETS_V2: PresetConfig[] = [
  {
    id: 'coaster-90',
    name: 'Coaster 90mm',
    description: 'Standard round coaster',
    shape: 'circle',
    diameter: 90,
    textCenter: 'COASTER',
  },
  {
    id: 'coaster-100',
    name: 'Coaster 100mm',
    description: 'Large round coaster',
    shape: 'circle',
    diameter: 100,
    textCenter: 'COASTER',
  },
  {
    id: 'badge-60',
    name: 'Badge 60mm',
    description: 'Small name badge',
    shape: 'circle',
    diameter: 60,
    textCenter: 'NAME',
  },
  {
    id: 'badge-70',
    name: 'Badge 70mm',
    description: 'Medium name badge',
    shape: 'circle',
    diameter: 70,
    textCenter: 'NAME',
  },
  {
    id: 'hex-90',
    name: 'Hex 90mm',
    description: 'Hexagon coaster',
    shape: 'hex',
    diameter: 90,
    textCenter: 'HEX',
  },
  {
    id: 'name-badge',
    name: 'Name Badge',
    description: 'Center text + bottom title',
    shape: 'circle',
    diameter: 70,
    textCenter: 'NAME',
  },
  {
    id: 'event-badge',
    name: 'Event Badge',
    description: 'Top + center + bottom',
    shape: 'circle',
    diameter: 80,
    textCenter: 'EVENT',
  },
];

// Constraints (re-export for convenience)
export const LIMITS = {
  diameter: { min: 30, max: 300 },
  width: { min: 30, max: 300 },
  height: { min: 40, max: 300 },
  borderThickness: { min: 0.2, max: 1.2, default: 0.4 },
  borderInset: { min: 1, max: 20, default: 3 },
  doubleBorderGap: { min: 0.8, max: 2.5, default: 1.2 },
  safeMargin: { min: 2, max: 15, default: 5 },
  fontSize: { min: 6, max: 40 },
  fontSizeCenter: { min: 10, max: 32 },
  fontSizeSmall: { min: 6, max: 16 },
  zoom: { min: 0.5, max: 2.5, default: 1 },
  letterSpacing: { min: -2, max: 5, default: 0 },
};

// Clamp helper
export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

// Sanitize dimensions
export function sanitizeDimensions(dims: DimensionConfig): DimensionConfig {
  return {
    ...dims,
    diameter: clamp(dims.diameter, LIMITS.diameter.min, LIMITS.diameter.max),
    width: clamp(dims.width, LIMITS.width.min, LIMITS.width.max),
    height: clamp(dims.height, LIMITS.height.min, LIMITS.height.max),
  };
}

// Sanitize border config
export function sanitizeBorder(border: BorderConfig, availableSpace: number): BorderConfig {
  const thickness = clamp(border.thickness, LIMITS.borderThickness.min, LIMITS.borderThickness.max);
  const inset = clamp(border.inset, LIMITS.borderInset.min, LIMITS.borderInset.max);
  const gap = clamp(border.doubleBorderGap, LIMITS.doubleBorderGap.min, LIMITS.doubleBorderGap.max);
  
  // Check if double border fits
  const minSpaceForDouble = inset + gap + thickness * 2 + 2;
  const canDoubleBorder = border.doubleBorder && availableSpace > minSpaceForDouble * 2;
  
  return {
    ...border,
    thickness,
    inset,
    doubleBorderGap: gap,
    doubleBorder: canDoubleBorder,
  };
}

// Calculate safe text area width
export function calculateSafeWidth(
  shape: ShapeType, 
  size: number, 
  border: BorderConfig, 
  safeMargin: number
): number {
  let available = size;
  
  if (border.enabled) {
    available -= border.inset * 2;
    if (border.doubleBorder) {
      available -= (border.doubleBorderGap + border.thickness) * 2;
    }
  }
  
  available -= safeMargin * 2;
  
  // For hex/shield, reduce slightly more
  if (shape === 'hex') {
    available *= 0.85;
  }
  
  return Math.max(10, available);
}

// Generate warnings based on state
export function generateWarnings(state: CoasterStateV2): Warning[] {
  const warnings: Warning[] = [];
  const { shape, dimensions, border, text, textFit, safeArea } = state;
  
  const size = shape === 'circle' || shape === 'hex' 
    ? dimensions.diameter 
    : Math.min(dimensions.width, dimensions.height);
  
  // Min size warnings
  if (shape === 'circle' && dimensions.diameter < 40) {
    warnings.push({
      id: 'min-diameter',
      level: 'warning',
      message: 'Diameter very small - text may not fit well',
    });
  }
  
  // Border warnings
  if (border.enabled) {
    const availableForBorder = size / 2;
    const borderSpace = border.inset + (border.doubleBorder ? border.doubleBorderGap + border.thickness : 0);
    
    if (borderSpace > availableForBorder * 0.4) {
      warnings.push({
        id: 'border-thick',
        level: 'warning',
        message: 'Borders too thick for this size',
      });
    }
    
    if (border.doubleBorder) {
      const minForDouble = border.inset + border.doubleBorderGap + border.thickness * 2 + 5;
      if (size / 2 < minForDouble) {
        warnings.push({
          id: 'double-border-space',
          level: 'warning',
          message: 'Double border disabled: insufficient space',
        });
      }
    }
  }
  
  // Text warnings
  const safeWidth = calculateSafeWidth(shape, size, border, safeArea.padding);
  
  if (text.center && text.center.length > 0) {
    const approxWidth = text.center.length * textFit.fontMaxCenter * 0.55;
    if (approxWidth > safeWidth && textFit.autoFit) {
      warnings.push({
        id: 'text-scaled',
        level: 'info',
        message: 'Text auto-scaled to fit',
      });
    }
    if (!textFit.autoFit && approxWidth > safeWidth) {
      warnings.push({
        id: 'text-overflow',
        level: 'warning',
        message: 'Text may overflow - enable auto-fit or reduce font size',
      });
    }
  }
  
  // Long text warning
  if (text.center && text.center.length > 15) {
    warnings.push({
      id: 'text-long',
      level: 'info',
      message: 'Long text detected - consider 2 lines',
    });
  }
  
  return warnings;
}

// Get effective size for shape
export function getEffectiveSize(shape: ShapeType, dims: DimensionConfig): number {
  if (shape === 'circle' || shape === 'hex' || shape === 'octagon' || shape === 'scalloped') {
    return dims.diameter;
  }
  return Math.max(dims.width, dims.height);
}

// Apply preset to state
export function applyPreset(state: CoasterStateV2, preset: PresetConfig): CoasterStateV2 {
  const newState = { ...state };
  
  newState.shape = preset.shape;
  
  if (preset.diameter !== undefined) {
    newState.dimensions = {
      ...newState.dimensions,
      diameter: preset.diameter,
    };
  }
  
  if (preset.width !== undefined) {
    newState.dimensions = {
      ...newState.dimensions,
      width: preset.width,
    };
  }
  
  if (preset.height !== undefined) {
    newState.dimensions = {
      ...newState.dimensions,
      height: preset.height,
    };
  }
  
  if (preset.textCenter !== undefined) {
    newState.text = {
      ...newState.text,
      center: preset.textCenter,
    };
  }
  
  if (preset.border) {
    newState.border = {
      ...newState.border,
      ...preset.border,
    };
  }
  
  return newState;
}

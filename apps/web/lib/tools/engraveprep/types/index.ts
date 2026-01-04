/**
 * EngravePrep Type Definitions
 * Complete type definitions for the laser engraving image preparation tool.
 */

export type DitherMode = 'none' | 'floyd-steinberg' | 'atkinson';
export type ExportFormat = 'png' | 'bmp';
export type AspectRatioOption = 'free' | '1:1' | '4:3' | '3:2' | '16:9';
export type DpiOption = 254 | 318 | 400;
export type PreviewMode = 'before' | 'after' | 'split';
export type EasyModeLevel = 1 | 2 | 3 | 4 | 5;
export type ActiveTab = 'photo' | 'test';
export type TestCardPatternType = 'solid' | 'gradientDetail' | 'photoSample';

export const ASPECT_RATIOS: Record<AspectRatioOption, number | undefined> = {
  'free': undefined,
  '1:1': 1,
  '4:3': 4 / 3,
  '3:2': 3 / 2,
  '16:9': 16 / 9,
};

export const DPI_OPTIONS: { value: DpiOption; label: string; description: string }[] = [
  { value: 254, label: '254 DPI', description: 'Fast, lower detail' },
  { value: 318, label: '318 DPI', description: 'Balanced (recommended)' },
  { value: 400, label: '400 DPI', description: 'High detail, slower' },
];

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropState {
  crop: { x: number; y: number };
  zoom: number;
  rotation: number;
  aspect: AspectRatioOption;
  croppedAreaPixels: CropArea | null;
  // Numeric crop inputs (percentages)
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
}

export interface ResizeState {
  widthMm: number;
  heightMm: number;
  dpi: DpiOption;
  lockAspectRatio: boolean;
}

export interface Adjustments {
  grayscale: boolean;
  brightness: number;
  contrast: number;
  gamma: number;
  invert: boolean;
  mirrorHorizontal: boolean;
}

export const DEFAULT_ADJUSTMENTS: Adjustments = {
  grayscale: true,
  brightness: 0,
  contrast: 0,
  gamma: 1.0,
  invert: false,
  mirrorHorizontal: false,
};

// Easy Mode level mappings
export const EASY_MODE_PRESETS: Record<EasyModeLevel, Adjustments & { ditherMode: DitherMode }> = {
  1: { grayscale: true, brightness: 0, contrast: -10, gamma: 0.9, invert: false, mirrorHorizontal: false, ditherMode: 'none' },
  2: { grayscale: true, brightness: 0, contrast: 5, gamma: 1.0, invert: false, mirrorHorizontal: false, ditherMode: 'atkinson' },
  3: { grayscale: true, brightness: 0, contrast: 15, gamma: 1.1, invert: false, mirrorHorizontal: false, ditherMode: 'floyd-steinberg' },
  4: { grayscale: true, brightness: 5, contrast: 30, gamma: 1.2, invert: false, mirrorHorizontal: false, ditherMode: 'floyd-steinberg' },
  5: { grayscale: true, brightness: 10, contrast: 45, gamma: 1.3, invert: false, mirrorHorizontal: false, ditherMode: 'floyd-steinberg' },
};

export const EASY_MODE_LABELS: Record<EasyModeLevel, string> = {
  1: 'Very Clean',
  2: 'Clean',
  3: 'Balanced',
  4: 'Detailed',
  5: 'Very Detailed',
};

export interface MaterialPreset {
  id: string;
  name: string;
  description: string;
  settings: Partial<Adjustments> & { ditherMode?: DitherMode };
}

export const MATERIAL_PRESETS: MaterialPreset[] = [
  {
    id: 'plywood',
    name: 'Plywood',
    description: 'Balanced settings',
    settings: { brightness: 0, contrast: 10, gamma: 1.0, invert: false, ditherMode: 'floyd-steinberg' },
  },
  {
    id: 'hardwood',
    name: 'Hardwood',
    description: 'Higher contrast',
    settings: { brightness: 5, contrast: 25, gamma: 1.1, invert: false, ditherMode: 'floyd-steinberg' },
  },
  {
    id: 'mdf',
    name: 'MDF',
    description: 'Lower contrast',
    settings: { brightness: 0, contrast: -5, gamma: 1.0, invert: false, ditherMode: 'floyd-steinberg' },
  },
  {
    id: 'acrylic',
    name: 'Acrylic',
    description: 'Inverted',
    settings: { brightness: 0, contrast: 15, gamma: 1.0, invert: true, ditherMode: 'floyd-steinberg' },
  },
  {
    id: 'aluminum',
    name: 'Anodized Aluminum',
    description: 'High contrast, no dither',
    settings: { brightness: 10, contrast: 40, gamma: 1.2, invert: false, ditherMode: 'none' },
  },
  {
    id: 'slate',
    name: 'Slate/Stone',
    description: 'Strong contrast',
    settings: { brightness: 5, contrast: 35, gamma: 1.15, invert: false, ditherMode: 'floyd-steinberg' },
  },
];

export interface WorkerInput {
  type: 'process';
  jobId: string; // For job cancellation
  imageData: ImageData;
  width: number;
  height: number;
  adjustments: Adjustments;
  ditherMethod: DitherMode;
  targetWidthPx: number;
  targetHeightPx: number;
}

export interface WorkerOutput {
  type: 'result' | 'error';
  jobId?: string; // For job cancellation
  imageData?: ImageData;
  error?: string;
}

export interface ImageInfo {
  fileName: string;
  originalWidth: number;
  originalHeight: number;
  fileSize: number;
}

// Lightweight metadata about the processed photo used for previews and
// Test Card photo sample generation.
export interface ProcessedImageInfo {
  width: number;
  height: number;
  // Downscaled PNG data URL used inside Test Card cells when patternType
  // is set to "photoSample".
  sampleDataUrl: string | null;
}

// User-saved preset
export interface UserPreset {
  id: string;
  name: string;
  settings: {
    brightness: number;
    contrast: number;
    gamma: number;
    grayscale: boolean;
    invert: boolean;
    mirrorHorizontal: boolean;
    ditherMode: DitherMode;
    dpi: DpiOption;
  };
  createdAt: number;
}

// Upload error types
export interface UploadError {
  type: 'size' | 'format' | 'dimensions' | 'unknown';
  message: string;
}

// Test Card form values used in the Test Card tab
export interface TestCardFormValues {
  materialName: string;
  thicknessMm: string; // keep as string to preserve user input formatting
  minPower: number;
  maxPower: number;
  stepsPower: number;
  minSpeed: number;
  maxSpeed: number;
  stepsSpeed: number;
  dpi: number;
  // Pattern used inside each test cell: solid block or gradient + fine details
  patternType?: TestCardPatternType;
}

// JSON-based project format for Save/Load functionality
export interface ProjectImageMeta {
  originalFileName: string | null;
  originalFileSize: number | null;
  originalWidth: number | null;
  originalHeight: number | null;
  // Simple hash for sanity checks (not cryptographic)
  hash: string | null;
}

export interface ProjectProcessingState {
  cropState: CropState;
  resizeState: ResizeState;
  targetWidthPx: number | null;
  targetHeightPx: number | null;
  adjustments: Adjustments;
  ditherMode: DitherMode;
  materialPresetId: string | null;
  easyMode: {
    enabled: boolean;
    level: EasyModeLevel;
  };
  previewMode: PreviewMode;
  splitPosition: number;
}

export interface ProjectUIState {
  activeTab: ActiveTab;
}

export interface ProjectV1 {
  version: 1;
  image: ProjectImageMeta;
  processing: ProjectProcessingState;
  ui: ProjectUIState;
  testCard?: TestCardFormValues;
}

export type Project = ProjectV1;

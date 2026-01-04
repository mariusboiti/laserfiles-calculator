/**
 * Keychain Hub - Types
 * Shared types for all keychain modes
 */

// Mode identifiers (implemented modes only)
export type KeychainModeId = 'simple' | 'emoji-name' | 'sticker-bubble';

// Warning types
export type WarningLevel = 'info' | 'warn' | 'error';

export interface Warning {
  id: string;
  level: WarningLevel;
  message: string;
  fix?: string;
}

// Hole configuration
export type HolePosition = 'left' | 'top' | 'right' | 'none';

export interface HoleConfig {
  enabled: boolean;
  diameter: number;
  margin: number;
  position: HolePosition;
}

// Render modes
export type RenderMode = '1-layer' | '2-layer' | '3-layer';

// Build result
export interface BuildResult {
  svgCombined: string;
  svgCut: string;
  svgEngrave: string;
  meta: {
    width: number;
    height: number;
    layers: number;
  };
}

export type LogoOpMode = 'engrave' | 'cutout';
export type TraceRenderMode = 'silhouette' | 'outline' | 'engrave';

export interface TraceLogoState {
  enabled: boolean;
  source: 'trace';
  paths: string[];
  bboxMm: { x: number; y: number; width: number; height: number };
  opMode: LogoOpMode;
  traceMode: TraceRenderMode;
  widthMm?: number;
  transform: {
    x: number;
    y: number;
    scale: number;
    rotateDeg: number;
  };
}

// Icon definition
export interface IconDef {
  id: string;
  name: string;
  category: string;
  paths: string[];
  viewBox: string;
}

// Mode interface
export interface KeychainMode<T = any> {
  id: KeychainModeId;
  label: string;
  description: string;
  icon: string;
  defaults: T;
  clamp: (state: Partial<T>) => T;
  build: (state: T) => BuildResult;
  getWarnings: (state: T) => Warning[];
  getFilenameBase: (state: T) => string;
}

// Simple mode state
export interface SimpleKeychainState {
  shape: 'rounded-rectangle' | 'capsule' | 'circle' | 'hexagon' | 'dog-tag';
  width: number;
  height: number;
  cornerRadius: number;
  hole: HoleConfig;
  text: string;
  text2: string;
  textMode: 'single' | 'double';
  fontFamily: string;
  fontWeight: string;
  fontSize: number;
  autoFit: boolean;
  fontMin: number;
  fontMax: number;
  lineGap: number;
  padding: number;
  border: boolean;
  borderWidth: number;
  cutStroke: number;
  engraveStyle: 'fill' | 'stroke' | 'fill+stroke';
  engraveStroke: number;
  logo?: TraceLogoState;
}

// Ring config for sticker keychains
export interface RingConfig {
  enabled: boolean;
  outerDiameter: number;    // mm (default 12)
  innerDiameter: number;    // mm keyring hole (default 6)
  bridgeWidth: number;      // mm connection width (default 6)
  bridgeThickness: number;  // mm connection height (default 3)
  gapFromSticker: number;   // mm gap between ring and sticker outline (default 0.8)
  position: 'left' | 'top' | 'right';
  offsetFromBody?: number;  // legacy alias for gapFromSticker
}

// Emoji + Name mode state (Cuttle-style sticker)
export interface EmojiNameState {
  // Content
  name: string;
  fontFamily: string;
  fontWeight: number;
  iconId: string | null;
  iconSizePct: number;       // icon size relative to text height (0.3-1.5)
  gap: number;               // gap between icon and text (mm)
  
  // Sticker outline (TRUE offset around silhouette via Clipper union+offset)
  stickerOffsetMm: number;   // offset distance around text+icon union (default 3)
  stickerSmoothMm: number;   // arc tolerance for smooth curves (default 0.6)
  
  // Ring (veriga) - attaches to sticker outline via bridge
  ring: RingConfig;
  
  // Text sizing
  fontSize: number;          // font size in mm (default 12)
  letterSpacing: number;     // letter spacing in mm (default 0)
  
  // Render options
  render: RenderMode;
  cutStroke: number;
  showBase: boolean;         // show base outline layer
  showTop: boolean;          // show top union layer
  debugShowUnion: boolean;   // dev toggle: show union as dashed line
  
  // Trace logo (optional)
  logo?: TraceLogoState;
  
  // Legacy fields (for backwards compatibility with old emojiName.ts)
  height?: number;
  maxWidth?: number;
  outline?: boolean;
  outlineThickness?: number;
  borderThickness?: number;
  hole?: HoleConfig;
  cornerRadius?: number;
  smoothing?: number;
}

// Sticker/Bubble mode state
export interface StickerBubbleState {
  height: number;
  maxWidth: number;
  text: string;
  text2: string;
  fontFamily: string;
  fontWeight: number;
  iconId: string | null;
  iconPosition: 'left' | 'top' | 'none';
  iconSizePct: number;
  gap: number;
  bubblePadding: number;
  bubbleCornerRadius: number;
  bubbleThickness: number;
  hole: HoleConfig;
  render: RenderMode;
  cutStroke: number;
  textAlign: 'left' | 'center' | 'right';
}

// Preview config
export interface PreviewConfig {
  showGrid: boolean;
  showSafeZones: boolean;
  showHoleGuide: boolean;
  showLayerColors: boolean;
}

// Export config
export interface ExportConfig {
  mode: 'combined' | 'cut' | 'engrave';
  includeGuides: boolean;
}

// Hub state
export interface KeychainHubState {
  activeMode: KeychainModeId;
  preview: PreviewConfig;
  modeStates: {
    simple: SimpleKeychainState;
    'emoji-name': EmojiNameState;
  };
}

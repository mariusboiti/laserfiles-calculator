/**
 * Zustand Store for EngravePrep
 * 
 * Manages the complete image processing pipeline state including:
 * - Original and cropped base images
 * - Crop, resize, adjustment, and dithering settings
 * - Material presets
 * - Export options
 */

import { create } from 'zustand';
import { 
  Adjustments, 
  DitherMode, 
  CropState,
  ResizeState,
  DEFAULT_ADJUSTMENTS,
  ExportFormat,
  ImageInfo,
  CropArea,
  DpiOption,
  PreviewMode,
  EasyModeLevel,
  UserPreset,
  EASY_MODE_PRESETS,
  ActiveTab,
  TestCardFormValues,
  Project,
  ProcessedImageInfo,
} from '../types';

interface ImageState {
  // Image data
  originalImage: ImageData | null;
  croppedImage: ImageData | null;
  processedImage: ImageData | null;
  processedImageInfo: ProcessedImageInfo | null;
  beforeAdjustmentsImage: ImageData | null; // For before/after preview
  previewImage: ImageData | null; // Downscaled preview for large images
  imageInfo: ImageInfo | null;
  
  // Crop state
  cropState: CropState;
  isCropping: boolean;
  preCropImage: ImageData | null; // For cancel crop
  
  // Resize state
  resizeState: ResizeState;
  
  // Adjustments
  adjustments: Adjustments;
  ditherMode: DitherMode;
  
  // Easy Mode
  easyMode: boolean;
  easyModeLevel: EasyModeLevel;
  savedManualSettings: (Adjustments & { ditherMode: DitherMode }) | null;
  
  // Preview mode
  previewMode: PreviewMode;
  splitPosition: number; // 0-100 percentage for split view
  
  // App UI
  activeTab: ActiveTab;
  testCardForm: TestCardFormValues | null;
  
  // User presets
  userPresets: UserPreset[];
  
  // UI state
  isProcessing: boolean;
  exportFormat: ExportFormat;
  currentJobId: string | null; // For job cancellation
  uploadError: string | null;
  
  // Actions - Upload
  setOriginalImage: (imageData: ImageData, info: ImageInfo) => void;
  setUploadError: (error: string | null) => void;
  
  // Actions - Crop
  setCropState: (state: Partial<CropState>) => void;
  setIsCropping: (isCropping: boolean) => void;
  applyCrop: (croppedArea: CropArea) => void;
  cancelCrop: () => void;
  
  // Actions - Resize
  setResizeWidth: (widthMm: number) => void;
  setResizeHeight: (heightMm: number) => void;
  setResizeDpi: (dpi: DpiOption) => void;
  toggleLockAspectRatio: () => void;
  
  // Actions - Adjustments
  setAdjustments: (adjustments: Partial<Adjustments>) => void;
  setDitherMode: (mode: DitherMode) => void;
  applyPreset: (settings: Partial<Adjustments> & { ditherMode?: DitherMode }) => void;
  
  // Actions - Easy Mode
  toggleEasyMode: () => void;
  setEasyModeLevel: (level: EasyModeLevel) => void;
  
  // Actions - Preview
  setPreviewMode: (mode: PreviewMode) => void;
  setSplitPosition: (position: number) => void;
  setBeforeAdjustmentsImage: (imageData: ImageData | null) => void;

  // App UI
  setActiveTab: (tab: ActiveTab) => void;
  setTestCardForm: (form: TestCardFormValues) => void;
  
  // Actions - User Presets
  saveUserPreset: (name: string) => void;
  loadUserPreset: (id: string) => void;
  deleteUserPreset: (id: string) => void;
  loadUserPresetsFromStorage: () => void;
  
  // Actions - Processing
  setProcessedImage: (imageData: ImageData | null) => void;
  setProcessedImageInfo: (info: ProcessedImageInfo | null) => void;
  setIsProcessing: (isProcessing: boolean) => void;
  setCurrentJobId: (jobId: string | null) => void;
  
  // Actions - Export
  setExportFormat: (format: ExportFormat) => void;
  
  // Actions - Reset
  reset: () => void;
  resetAdjustments: () => void;

  // Actions - Project load
  loadProject: (project: Project) => void;
}

export const useImageStore = create<ImageState>((set, get) => ({
  // Initial state
  originalImage: null,
  croppedImage: null,
  processedImage: null,
  processedImageInfo: null,
  beforeAdjustmentsImage: null,
  previewImage: null,
  imageInfo: null,
  
  cropState: {
    crop: { x: 0, y: 0 },
    zoom: 1,
    rotation: 0,
    aspect: 'free',
    croppedAreaPixels: null,
    cropX: 0,
    cropY: 0,
    cropWidth: 100,
    cropHeight: 100,
  },
  isCropping: false,
  preCropImage: null,
  
  resizeState: {
    widthMm: 100,
    heightMm: 100,
    dpi: 318,
    lockAspectRatio: true,
  },
  
  adjustments: DEFAULT_ADJUSTMENTS,
  ditherMode: 'floyd-steinberg',
  
  easyMode: false,
  easyModeLevel: 3,
  savedManualSettings: null,
  
  previewMode: 'after',
  splitPosition: 50,
  
  activeTab: 'photo',
  testCardForm: null,
  
  userPresets: [],
  
  isProcessing: false,
  exportFormat: 'png',
  currentJobId: null,
  uploadError: null,
  
  // Upload
  setOriginalImage: (imageData, info) => set({
    originalImage: imageData,
    croppedImage: imageData,
    imageInfo: info,
    processedImage: null,
    beforeAdjustmentsImage: null,
    uploadError: null,
    resizeState: {
      widthMm: 100,
      heightMm: Math.round(100 * (imageData.height / imageData.width)),
      dpi: 318,
      lockAspectRatio: true,
    },
  }),
  
  setUploadError: (error) => set({ uploadError: error }),
  
  // Crop
  setCropState: (state) => set((prev) => ({
    cropState: { ...prev.cropState, ...state }
  })),
  
  setIsCropping: (isCropping) => {
    const { croppedImage } = get();
    set({ 
      isCropping,
      preCropImage: isCropping ? croppedImage : null // Save current image when starting crop
    });
  },
  
  cancelCrop: () => {
    const { preCropImage } = get();
    if (preCropImage) {
      set({
        croppedImage: preCropImage,
        isCropping: false,
        preCropImage: null,
        processedImage: null,
      });
    }
  },
  
  applyCrop: (croppedArea) => {
    const { originalImage } = get();
    if (!originalImage) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = croppedArea.width;
    canvas.height = croppedArea.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = originalImage.width;
    tempCanvas.height = originalImage.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;
    
    tempCtx.putImageData(originalImage, 0, 0);
    ctx.drawImage(
      tempCanvas,
      croppedArea.x,
      croppedArea.y,
      croppedArea.width,
      croppedArea.height,
      0,
      0,
      croppedArea.width,
      croppedArea.height
    );
    
    const croppedImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    set({
      croppedImage: croppedImageData,
      isCropping: false,
      processedImage: null,
    });
  },
  
  // Resize
  setResizeWidth: (widthMm) => {
    const { resizeState, croppedImage } = get();
    if (resizeState.lockAspectRatio && croppedImage) {
      const aspectRatio = croppedImage.width / croppedImage.height;
      set({
        resizeState: {
          ...resizeState,
          widthMm,
          heightMm: Math.round(widthMm / aspectRatio),
        }
      });
    } else {
      set({
        resizeState: { ...resizeState, widthMm }
      });
    }
  },
  
  setResizeHeight: (heightMm) => {
    const { resizeState, croppedImage } = get();
    if (resizeState.lockAspectRatio && croppedImage) {
      const aspectRatio = croppedImage.width / croppedImage.height;
      set({
        resizeState: {
          ...resizeState,
          heightMm,
          widthMm: Math.round(heightMm * aspectRatio),
        }
      });
    } else {
      set({
        resizeState: { ...resizeState, heightMm }
      });
    }
  },
  
  setResizeDpi: (dpi) => set((state) => ({
    resizeState: { ...state.resizeState, dpi }
  })),
  
  toggleLockAspectRatio: () => set((state) => ({
    resizeState: { ...state.resizeState, lockAspectRatio: !state.resizeState.lockAspectRatio }
  })),
  
  // Adjustments
  setAdjustments: (adjustments) => set((state) => ({
    adjustments: { ...state.adjustments, ...adjustments }
  })),
  
  setDitherMode: (ditherMode) => set({ ditherMode }),
  
  applyPreset: (settings) => {
    const { ditherMode, ...adjustmentSettings } = settings;
    set((prev) => ({
      adjustments: { ...prev.adjustments, ...adjustmentSettings },
      ...(ditherMode && { ditherMode }),
      easyMode: false, // Turn off Easy Mode when applying preset
    }));
  },
  
  // Easy Mode
  toggleEasyMode: () => {
    const { easyMode, adjustments, ditherMode, easyModeLevel } = get();
    
    if (!easyMode) {
      // Turning Easy Mode ON: save current manual settings and apply Easy Mode preset
      const preset = EASY_MODE_PRESETS[easyModeLevel];
      set({
        easyMode: true,
        savedManualSettings: { ...adjustments, ditherMode },
        adjustments: {
          grayscale: preset.grayscale,
          brightness: preset.brightness,
          contrast: preset.contrast,
          gamma: preset.gamma,
          invert: preset.invert,
          mirrorHorizontal: adjustments.mirrorHorizontal, // Keep mirror setting
        },
        ditherMode: preset.ditherMode,
      });
    } else {
      // Turning Easy Mode OFF: restore saved manual settings
      const { savedManualSettings } = get();
      if (savedManualSettings) {
        const { ditherMode: savedDither, ...savedAdj } = savedManualSettings;
        set({
          easyMode: false,
          adjustments: savedAdj,
          ditherMode: savedDither,
        });
      } else {
        set({ easyMode: false });
      }
    }
  },
  
  setEasyModeLevel: (level) => {
    const { easyMode, adjustments } = get();
    const preset = EASY_MODE_PRESETS[level];
    
    set({
      easyModeLevel: level,
      ...(easyMode && {
        adjustments: {
          grayscale: preset.grayscale,
          brightness: preset.brightness,
          contrast: preset.contrast,
          gamma: preset.gamma,
          invert: preset.invert,
          mirrorHorizontal: adjustments.mirrorHorizontal,
        },
        ditherMode: preset.ditherMode,
      }),
    });
  },
  
  // Preview
  setPreviewMode: (mode) => set({ previewMode: mode }),
  setSplitPosition: (position) => set({ splitPosition: position }),
  setBeforeAdjustmentsImage: (imageData) => set({ beforeAdjustmentsImage: imageData }),
  
  // App UI
  setActiveTab: (tab) => set({ activeTab: tab }),
  setTestCardForm: (form) => set({ testCardForm: form }),
  
  // User Presets
  saveUserPreset: (name) => {
    const { adjustments, ditherMode, resizeState, userPresets } = get();
    const newPreset: UserPreset = {
      id: `preset_${Date.now()}`,
      name,
      settings: {
        brightness: adjustments.brightness,
        contrast: adjustments.contrast,
        gamma: adjustments.gamma,
        grayscale: adjustments.grayscale,
        invert: adjustments.invert,
        mirrorHorizontal: adjustments.mirrorHorizontal,
        ditherMode,
        dpi: resizeState.dpi,
      },
      createdAt: Date.now(),
    };
    
    const updated = [...userPresets, newPreset];
    set({ userPresets: updated });
    
    // Persist to localStorage
    try {
      localStorage.setItem('engraveprep:userPresets', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save preset to localStorage:', e);
    }
  },
  
  loadUserPreset: (id) => {
    const { userPresets } = get();
    const preset = userPresets.find(p => p.id === id);
    if (preset) {
      const { ditherMode: presetDither, dpi, ...presetAdj } = preset.settings;
      set({
        adjustments: presetAdj,
        ditherMode: presetDither,
        resizeState: { ...get().resizeState, dpi },
        easyMode: false, // Turn off Easy Mode when loading user preset
      });
    }
  },
  
  deleteUserPreset: (id) => {
    const { userPresets } = get();
    const updated = userPresets.filter(p => p.id !== id);
    set({ userPresets: updated });
    
    // Persist to localStorage
    try {
      localStorage.setItem('engraveprep:userPresets', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to delete preset from localStorage:', e);
    }
  },
  
  loadUserPresetsFromStorage: () => {
    try {
      const stored = localStorage.getItem('engraveprep:userPresets');
      if (stored) {
        const parsed = JSON.parse(stored) as UserPreset[];
        set({ userPresets: parsed });
      }
    } catch (e) {
      console.error('Failed to load presets from localStorage:', e);
      set({ userPresets: [] });
    }
  },
  
  // Processing
  setProcessedImage: (imageData) => set({ processedImage: imageData }),
  setProcessedImageInfo: (info) => set({ processedImageInfo: info }),
  setIsProcessing: (isProcessing) => set({ isProcessing }),
  setCurrentJobId: (jobId) => set({ currentJobId: jobId }),
  
  // Export
  setExportFormat: (exportFormat) => set({ exportFormat }),
  
  // Reset
  reset: () => set({
    originalImage: null,
    croppedImage: null,
    processedImage: null,
    processedImageInfo: null,
    beforeAdjustmentsImage: null,
    previewImage: null,
    imageInfo: null,
    cropState: {
      crop: { x: 0, y: 0 },
      zoom: 1,
      rotation: 0,
      aspect: 'free',
      croppedAreaPixels: null,
      cropX: 0,
      cropY: 0,
      cropWidth: 100,
      cropHeight: 100,
    },
    isCropping: false,
    preCropImage: null,
    resizeState: {
      widthMm: 100,
      heightMm: 100,
      dpi: 318,
      lockAspectRatio: true,
    },
    adjustments: DEFAULT_ADJUSTMENTS,
    ditherMode: 'floyd-steinberg',
    easyMode: false,
    easyModeLevel: 3,
    savedManualSettings: null,
    previewMode: 'after',
    isProcessing: false,
    uploadError: null,
  }),
  
  resetAdjustments: () => set({
    adjustments: DEFAULT_ADJUSTMENTS,
    ditherMode: 'floyd-steinberg',
    easyMode: false,
    savedManualSettings: null,
  }),

  // Load project (does not embed image data, only state)
  loadProject: (project) => {
    const { image, processing, ui, testCard } = project;

    set((state) => ({
      // Keep existing image data; only update metadata if present
      imageInfo: image.originalFileName
        ? {
            fileName: image.originalFileName,
            originalWidth: image.originalWidth ?? state.imageInfo?.originalWidth ?? 0,
            originalHeight: image.originalHeight ?? state.imageInfo?.originalHeight ?? 0,
            fileSize: image.originalFileSize ?? state.imageInfo?.fileSize ?? 0,
          }
        : state.imageInfo,
      
      cropState: processing.cropState,
      resizeState: processing.resizeState,
      adjustments: processing.adjustments,
      ditherMode: processing.ditherMode,
      easyMode: processing.easyMode.enabled,
      easyModeLevel: processing.easyMode.level,
      previewMode: processing.previewMode,
      splitPosition: processing.splitPosition,
      activeTab: ui.activeTab,
      testCardForm: testCard ?? state.testCardForm,
      isProcessing: false,
    }));
  },
}));

/**
 * EngravePrep - Main Application Component
 * 
 * Browser-based tool for preparing photos for laser engraving.
 * 
 * Features:
 * - Upload (drag & drop or file picker)
 * - Crop with aspect ratios
 * - Resize (mm + DPI)
 * - Adjustments (grayscale, brightness, contrast, gamma, invert, mirror)
 * - Material presets
 * - Dithering (Floyd-Steinberg, Atkinson)
 * - Export (PNG, BMP)
 * - Embed mode support
 */

import { useEffect, useState } from 'react';
import { TopBar } from './components/TopBar';
import { PreviewCanvas } from './components/PreviewCanvas';
import { PreviewModeSelector } from './components/PreviewModeSelector';
import { useImageProcessor } from './hooks/useImageProcessor';
import { useImageStore } from './store/useImageStore';
import { UploadZone } from './features/upload/UploadZone';
import { CropTool } from './features/crop/CropTool';
import { ResizeControls } from './features/resize/ResizeControls';
import { AdjustmentControls } from './features/adjustments/AdjustmentControls';
import { MaterialPresets } from './features/presets/MaterialPresets';
// import { DitheringControls } from './features/dithering/DitheringControls';
import { UserPresetsPanel } from './features/presets/UserPresetsPanel';
import { TestCardPanel } from './features/testCard/TestCardPanel';
import { ENABLE_TEST_CARD } from './config/featureFlags';
import styles from './engraveprep.module.css';

function App() {
  useImageProcessor();
  
  const [embedMode, setEmbedMode] = useState(false);
  const { originalImage, imageInfo, loadUserPresetsFromStorage, activeTab, setActiveTab } = useImageStore();

  // When the Test Card feature is disabled, always treat the active tab as
  // "photo" to avoid exposing the hidden tab via state.
  const effectiveTab = ENABLE_TEST_CARD ? activeTab : 'photo';

  // Check for embed mode
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEmbedMode(params.get('embed') === '1');
  }, []);

  // Load user presets from localStorage on mount
  useEffect(() => {
    loadUserPresetsFromStorage();
  }, [loadUserPresetsFromStorage]);

  // Embed mode: auto-height messaging for iframe resizing
  useEffect(() => {
    if (!embedMode) return;

    const sendHeight = () => {
      const height = document.documentElement.scrollHeight;
      window.parent.postMessage(
        { type: 'engraveprep-resize', height },
        '*'
      );
    };

    // Send height on mount and when layout changes
    sendHeight();
    
    // Send height on window resize
    const resizeObserver = new ResizeObserver(sendHeight);
    resizeObserver.observe(document.body);

    return () => {
      resizeObserver.disconnect();
    };
  }, [embedMode]);

  return (
    <div className={`lfs-tool lfs-tool-engraveprep ${styles.ep_root}`}>
      <div className={styles.ep_topbar}>
        <TopBar embedMode={embedMode} />
      </div>

      {/* Tabs: Photo Prep (and Test Card when enabled via feature flag) */}
      <div className={styles.ep_tabs}>
        <div className="inline-flex rounded-md bg-[#2a2d44] p-0.5 text-sm">
          <button
            onClick={() => setActiveTab('photo')}
            className={`px-4 py-1.5 rounded-md transition-colors font-medium ${
              effectiveTab === 'photo'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Photo Prep
          </button>
          {ENABLE_TEST_CARD && (
            <button
              onClick={() => setActiveTab('test')}
              className={`px-4 py-1.5 rounded-md transition-colors font-medium ${
                effectiveTab === 'test'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Test Card
            </button>
          )}
        </div>
      </div>
      
      {effectiveTab === 'photo' ? (
        <div className={styles.ep_main}>
          {/* Left: Preview area */}
          <div className={styles.ep_preview}>
            {!originalImage ? (
              <div className={styles.ep_upload}>
                <UploadZone />
              </div>
            ) : (
              <>
                <div className={styles.ep_preview_modes}>
                  <PreviewModeSelector />
                </div>
                <div className={styles.ep_preview_canvas}>
                  <PreviewCanvas />
                </div>
              </>
            )}
          </div>
          
          {/* Right: Controls panel */}
          {originalImage && (
            <div className={styles.ep_controls}>
              <div className={styles.ep_controls_inner}>
                {/* File Info */}
                {imageInfo && (
                  <div className="lg:hidden pb-4 border-b border-gray-700/50">
                    <div className="text-sm text-gray-200 font-medium">{imageInfo.fileName}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {imageInfo.originalWidth} × {imageInfo.originalHeight} px
                    </div>
                  </div>
                )}

                {/* Crop Tool */}
                <CropTool />

                {/* Resize Controls */}
                <div className={styles.ep_section}>
                  <ResizeControls />
                </div>

                {/* Material Presets */}
                <div className={styles.ep_section}>
                  <MaterialPresets />
                </div>

                {/* Adjustments */}
                <div className={styles.ep_section}>
                  <AdjustmentControls />
                </div>

                {/* Dithering - Temporarily disabled due to module resolution issues */}
                {/* 
                <div className={styles.ep_section}>
                  <DitheringControls />
                </div>
                */}

                {/* User Presets */}
                <div className={styles.ep_section}>
                  <UserPresetsPanel />
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        ENABLE_TEST_CARD ? (
          <div className="flex-1 overflow-auto p-3 sm:p-4">
            <TestCardPanel />
          </div>
        ) : null
      )}
      
      {/* Crop overlay (full-screen when active, only relevant for Photo tab) */}
      {effectiveTab === 'photo' && <CropTool />}
    </div>
  );
}

// Expose downloadTestBmp to window for dev testing
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  import('./utils/exportBmp').then(({ downloadTestBmp }) => {
    (window as any).downloadTestBmp = downloadTestBmp;
    console.log('Dev helper available: window.downloadTestBmp()');
  });
}

export default App;

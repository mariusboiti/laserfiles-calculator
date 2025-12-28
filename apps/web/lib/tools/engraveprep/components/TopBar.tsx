/**
 * TopBar Component
 * 
 * Top navigation with:
 * - Reset
 * - Save/Load Project (.engraveprep JSON)
 * - Download dropdown (PNG/BMP)
 * - Embed modal
 * Shows file info and adapts to embed mode.
 */

import { useRef, useState } from 'react';
import { RotateCcw, Download, Zap, ChevronDown, Code } from 'lucide-react';
import { useImageStore } from '../store/useImageStore';
import { exportImage } from '../utils/export';
import { ExportFormat, Project } from '../types';
import { MATERIAL_PRESET_CONFIG } from '../features/presets/presetConfig';
import { generateExportFilename } from '../utils/exportNaming';

interface TopBarProps {
  embedMode?: boolean;
}

export function TopBar({ embedMode = false }: TopBarProps) {
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [projectWarning, setProjectWarning] = useState<string | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  const {
    imageInfo,
    processedImage,
    reset,
    isProcessing,
    cropState,
    resizeState,
    adjustments,
    ditherMode,
    easyMode,
    easyModeLevel,
    previewMode,
    splitPosition,
    activeTab,
    testCardForm,
    loadProject,
  } = useImageStore();

  const handleDownload = async (format: ExportFormat) => {
    if (!processedImage || !imageInfo) return;
    
    const outputName = `${imageInfo.fileName}_engraved`;
    
    try {
      await exportImage(processedImage, format, outputName, () => {
        // Show upgrade modal when limit reached
        alert('Export limit reached. Please upgrade your plan at /pricing to continue exporting.');
      });
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
    
    setShowDownloadMenu(false);
  };

  // Build a JSON-serializable Project object from current store state
  const buildProject = (): Project => {
    const mmToInch = 1 / 25.4;
    const targetWidthPx = Math.round(
      resizeState.widthMm * mmToInch * resizeState.dpi
    );
    const targetHeightPx = Math.round(
      resizeState.heightMm * mmToInch * resizeState.dpi
    );

    // Try to infer material preset id if current adjustments match one of the presets
    let materialPresetId: string | null = null;
    for (const preset of MATERIAL_PRESET_CONFIG) {
      const s = preset.settings;
      if (
        adjustments.brightness === s.brightness &&
        adjustments.contrast === s.contrast &&
        adjustments.gamma === s.gamma &&
        adjustments.invert === s.invert &&
        ditherMode === s.ditherMethod
      ) {
        materialPresetId = preset.id;
        break;
      }
    }

    const imageMeta = {
      originalFileName: imageInfo?.fileName ?? null,
      originalFileSize: imageInfo?.fileSize ?? null,
      originalWidth: imageInfo?.originalWidth ?? null,
      originalHeight: imageInfo?.originalHeight ?? null,
      hash: imageInfo
        ? `${imageInfo.fileName}-${imageInfo.fileSize}-${imageInfo.originalWidth}x${imageInfo.originalHeight}`
        : null,
    };

    const project: Project = {
      version: 1,
      image: imageMeta,
      processing: {
        cropState,
        resizeState,
        targetWidthPx,
        targetHeightPx,
        adjustments,
        ditherMode,
        materialPresetId,
        easyMode: {
          enabled: easyMode,
          level: easyModeLevel,
        },
        previewMode,
        splitPosition,
      },
      ui: {
        activeTab,
      },
      testCard: testCardForm ?? undefined,
    };

    return project;
  };

  const handleSaveProject = () => {
    try {
      const project = buildProject();
      const json = JSON.stringify(project, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const link = document.createElement('a');
      link.href = url;
      link.download = `engraveprep-${timestamp}.engraveprep`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setProjectError(null);
    } catch (err) {
      console.error('Failed to save project', err);
      setProjectError('Failed to save project. Please try again.');
    }
  };

  const handleLoadProjectClick = () => {
    fileInputRef.current?.click();
  };

  const handleProjectFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? '');
        const data = JSON.parse(text) as Partial<Project>;

        if (!data || typeof data !== 'object' || data.version !== 1) {
          setProjectError('Invalid project file (unsupported or missing version).');
          return;
        }
        if (!data.image || !data.processing || !data.ui) {
          setProjectError('Invalid project file (missing required fields).');
          return;
        }

        const project = data as Project;

        // Image warning logic
        if (!imageInfo) {
          setProjectWarning(
            project.image.originalFileName
              ? `This project was saved for image "${project.image.originalFileName}". Upload the same image for best results before applying these settings.`
              : 'This project has no image metadata. Upload an image before using these settings for best results.'
          );
        } else if (
          project.image.originalFileName &&
          project.image.originalFileName !== imageInfo.fileName
        ) {
          setProjectWarning(
            `This project was saved for image "${project.image.originalFileName}" but you currently have "${imageInfo.fileName}" loaded. Settings will still be applied.`
          );
        } else {
          setProjectWarning(null);
        }

        setProjectError(null);
        loadProject(project);
      } catch (err) {
        console.error('Failed to load project', err);
        setProjectError('Could not read project file. Make sure it is a valid .engraveprep JSON.');
      } finally {
        e.target.value = '';
      }
    };

    reader.onerror = () => {
      setProjectError('Could not read project file.');
    };

    reader.readAsText(file);
  };

  const embedCode = `<iframe id="engraveprep-iframe" src="${window.location.origin}?embed=1" width="100%" height="800" frameborder="0"></iframe>`;
  
  const embedScript = `<script>
  // Auto-resize iframe based on content height
  window.addEventListener('message', function(e) {
    if (e.data.type === 'engraveprep-resize') {
      const iframe = document.getElementById('engraveprep-iframe');
      if (iframe) {
        iframe.style.height = e.data.height + 'px';
      }
    }
  });
</script>`;

  if (embedMode) return null;

  return (
    <>
      <header className={`flex items-center justify-between px-4 py-3 bg-[#2a2d44] border-b border-gray-800 ${embedMode ? 'hidden' : ''}`}>
        {/* Left: File info or logo */}
        <div className="flex items-center gap-3 min-w-0">
          {imageInfo ? (
            <div className="hidden sm:block min-w-0">
              <div className="text-sm font-medium text-white truncate">{imageInfo.fileName}</div>
              <div className="text-xs text-gray-500">
                {imageInfo.originalWidth} × {imageInfo.originalHeight} px
              </div>
            </div>
          ) : (
            <div className="text-lg font-semibold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-500" />
              EngravePrep
            </div>
          )}
        </div>

        {/* Right: Action buttons */}
        <div className="flex items-center gap-2">
          {/* Reset button */}
          <button
            onClick={reset}
            disabled={!imageInfo}
            className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 
                       text-white rounded-md transition-colors disabled:opacity-50 
                       disabled:cursor-not-allowed text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          {/* Download dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDownloadMenu(!showDownloadMenu)}
              disabled={!processedImage || isProcessing}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 
                         text-white rounded-md transition-colors disabled:opacity-50 
                         disabled:cursor-not-allowed text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            
            {showDownloadMenu && (
              <div className="absolute right-0 mt-2 w-32 bg-[#2a2d44] rounded-md shadow-lg z-50 overflow-hidden border border-gray-700">
                <button
                  onClick={() => handleDownload('png')}
                  className="w-full px-4 py-2 text-left text-white hover:bg-[#1e2139] transition-colors text-sm"
                >
                  PNG
                </button>
                <button
                  onClick={() => handleDownload('bmp')}
                  className="w-full px-4 py-2 text-left text-white hover:bg-[#1e2139] transition-colors text-sm"
                >
                  BMP
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Project load warnings/errors */}
        {(projectWarning || projectError) && (
          <div className="mt-2 text-xs space-y-1">
            {projectWarning && (
              <div className="px-3 py-2 rounded bg-yellow-900/40 border border-yellow-700 text-yellow-100">
                {projectWarning}
              </div>
            )}
            {projectError && (
              <div className="px-3 py-2 rounded bg-red-900/40 border border-red-700 text-red-100">
                {projectError}
              </div>
            )}
          </div>
        )}

        {/* Hidden file input for project loading */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".engraveprep,application/json"
          className="hidden"
          onChange={handleProjectFileChange}
        />
      </header>

      {/* Embed Modal */}
      {showEmbedModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
             onClick={() => setShowEmbedModal(false)}>
          <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full"
               onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-4">Embed EngravePrep</h3>
            <p className="text-gray-300 mb-4 text-sm">
              Copy this code to embed EngravePrep in your WordPress site or any webpage:
            </p>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-gray-400 mb-1">Iframe code:</div>
                <div className="bg-gray-900 p-3 rounded font-mono text-xs text-gray-300 overflow-x-auto">
                  {embedCode}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Auto-resize script (add to your page):</div>
                <div className="bg-gray-900 p-3 rounded font-mono text-xs text-gray-300 overflow-x-auto whitespace-pre">
                  {embedScript}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  const fullCode = embedCode + '\n\n' + embedScript;
                  navigator.clipboard.writeText(fullCode);
                  alert('Embed code and script copied to clipboard!');
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Copy All
              </button>
              <button
                onClick={() => setShowEmbedModal(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

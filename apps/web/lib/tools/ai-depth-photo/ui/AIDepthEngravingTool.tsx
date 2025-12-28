'use client';

import { useState, useEffect } from 'react';
import type { AspectRatio, DepthStyle, MaterialProfile, DepthZones, PreviewMode } from '../types';
import { ASPECT_RATIOS, STYLE_PRESETS, MATERIAL_PROFILES } from '../types';

type TabView = 'final' | 'depth' | 'layers';
type HistStatus = 'missingBlacks' | 'tooFlat' | 'ready' | null;

// Helper: Decode base64/dataURL to ImageData
async function decodeToImageData(dataUrl: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      resolve(imageData);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

// Helper: Convert ImageData to dataURL
function imageDataToDataUrl(imageData: ImageData): string {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

// Helper: Apply false color to grayscale ImageData
function applyFalseColor(grayscaleData: ImageData): ImageData {
  const colorData = new ImageData(grayscaleData.width, grayscaleData.height);
  const src = grayscaleData.data;
  const dst = colorData.data;
  
  for (let i = 0; i < src.length; i += 4) {
    const gray = src[i]; // R channel (grayscale)
    
    // Heatmap: deep (black) = red, mid = orange/yellow, high (white) = white
    let r, g, b;
    if (gray < 85) {
      // Deep: black to red
      r = Math.floor((gray / 85) * 255);
      g = 0;
      b = 0;
    } else if (gray < 170) {
      // Mid: red to yellow
      r = 255;
      g = Math.floor(((gray - 85) / 85) * 255);
      b = 0;
    } else {
      // High: yellow to white
      r = 255;
      g = 255;
      b = Math.floor(((gray - 170) / 85) * 255);
    }
    
    dst[i] = r;
    dst[i + 1] = g;
    dst[i + 2] = b;
    dst[i + 3] = 255; // Alpha
  }
  
  return colorData;
}

// Helper: Compute histogram from ImageData
function computeHistogram(imageData: ImageData): { bins: number[]; status: HistStatus } {
  const bins = new Array(256).fill(0);
  const data = imageData.data;
  
  // Count grayscale values (use R channel)
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i];
    bins[gray]++;
  }
  
  const totalPixels = imageData.width * imageData.height;
  
  // Check for missing blacks (< 0.2% in [0..10])
  let blackPixels = 0;
  for (let i = 0; i <= 10; i++) {
    blackPixels += bins[i];
  }
  const blackRatio = blackPixels / totalPixels;
  
  if (blackRatio < 0.002) {
    return { bins, status: 'missingBlacks' };
  }
  
  // Check if too flat (p95 - p05 < 120)
  let cumulative = 0;
  let p05 = 0, p95 = 0;
  const threshold05 = totalPixels * 0.05;
  const threshold95 = totalPixels * 0.95;
  
  for (let i = 0; i < 256; i++) {
    cumulative += bins[i];
    if (cumulative >= threshold05 && p05 === 0) p05 = i;
    if (cumulative >= threshold95 && p95 === 0) {
      p95 = i;
      break;
    }
  }
  
  if (p95 - p05 < 120) {
    return { bins, status: 'tooFlat' };
  }
  
  return { bins, status: 'ready' };
}

export function AIDepthEngravingTool() {
  const [prompt, setPrompt] = useState('');
  const [style] = useState<DepthStyle>('bas-relief-engraving');
  const [ratio, setRatio] = useState<AspectRatio>('1:1');
  const [activeTab, setActiveTab] = useState<TabView>('depth');
  
  // V3 Engraving Controls
  const [materialProfile, setMaterialProfile] = useState<MaterialProfile>('birch-plywood');
  const [depthZones, setDepthZones] = useState<DepthZones>(4);
  const [engravingDepthBoost, setEngravingDepthBoost] = useState(50);
  const [invertDepth, setInvertDepth] = useState(false);
  
  // Preview controls
  const [viewMode, setViewMode] = useState<PreviewMode>('grayscale');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [finalImage, setFinalImage] = useState<string | null>(null);
  const [heightMapDataUrl, setHeightMapDataUrl] = useState<string | null>(null);
  const [heightMapImageData, setHeightMapImageData] = useState<ImageData | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [histBins, setHistBins] = useState<number[] | null>(null);
  const [histStatus, setHistStatus] = useState<HistStatus>(null);
  const [seed, setSeed] = useState<string | null>(null);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      alert('Please enter a subject description');
      return;
    }

    setIsGenerating(true);
    setFinalImage(null);
    setHeightMapDataUrl(null);
    setHeightMapImageData(null);
    setPreviewDataUrl(null);
    setHistBins(null);
    setHistStatus(null);
    setSeed(null);
    setValidationWarnings([]);

    try {
      const requestBody = {
        prompt: prompt.trim(),
        style,
        ratio,
        engravingOptions: {
          materialProfile,
          depthZones,
          engravingDepthBoost,
          invertDepth,
        },
      };

      const response = await fetch('/api/ai/depth-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate image');
      }

      const data = await response.json();
      setFinalImage(data.imagePngBase64);
      
      // Set height map as dataURL (add data:image/png;base64, prefix if needed)
      const heightMapData = data.depthMapPngBase64 || data.imagePngBase64;
      const heightMapUrl = heightMapData.startsWith('data:') 
        ? heightMapData 
        : `data:image/png;base64,${heightMapData}`;
      setHeightMapDataUrl(heightMapUrl);
      
      setSeed(data.seed);
      setValidationWarnings(data.validationWarnings || []);

      // Auto-switch to depth tab after generation
      setActiveTab('depth');
    } catch (error) {
      console.error('Generation error:', error);
      alert(`Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Reactive effect: Process height map when it changes or viewMode changes
  useEffect(() => {
    if (!heightMapDataUrl) {
      setHeightMapImageData(null);
      setPreviewDataUrl(null);
      setHistBins(null);
      setHistStatus(null);
      return;
    }

    async function processHeightMap() {
      try {
        // 1. Decode to ImageData
        const imageData = await decodeToImageData(heightMapDataUrl!);
        setHeightMapImageData(imageData);

        // 2. Compute histogram
        const { bins, status } = computeHistogram(imageData);
        setHistBins(bins);
        setHistStatus(status);

        // 3. Generate preview based on viewMode
        let previewImageData: ImageData;
        if (viewMode === 'false-color') {
          previewImageData = applyFalseColor(imageData);
        } else {
          // Grayscale - use original
          previewImageData = imageData;
        }

        // 4. Convert to dataURL
        const previewUrl = imageDataToDataUrl(previewImageData);
        setPreviewDataUrl(previewUrl);
      } catch (error) {
        console.error('Failed to process height map:', error);
      }
    }

    processHeightMap();
  }, [heightMapDataUrl, viewMode]);

  const downloadHeightMap = () => {
    if (!heightMapDataUrl) return;
    const link = document.createElement('a');
    link.href = heightMapDataUrl;
    link.download = `height-map-${Date.now()}.png`;
    link.click();
  };

  const downloadPreview = () => {
    if (!finalImage) return;
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${finalImage}`;
    link.download = `preview-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="flex h-full gap-6 p-6">
      {/* LEFT PANEL - Engraving Controls */}
      <div className="w-80 flex-shrink-0 space-y-4 overflow-y-auto rounded-lg border border-slate-700 bg-slate-800/50 p-4">
        <div>
          <h2 className="mb-4 text-lg font-bold text-slate-100">AI Depth Engraving Tool</h2>
          <p className="text-xs text-slate-400">Professional laser engraving height map generator</p>
        </div>

        {/* Prompt */}
        <div>
          <label className="block text-sm font-medium text-slate-200">Subject Description</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Mountain landscape, Portrait of a cat, Geometric pattern..."
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            rows={3}
          />
        </div>

        {/* Style (locked) */}
        <div>
          <label className="block text-sm font-medium text-slate-200">Engraving Style</label>
          <div className="mt-2 rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-slate-300">
            {STYLE_PRESETS[style].label}
          </div>
          <p className="mt-1 text-xs text-slate-400">{STYLE_PRESETS[style].description}</p>
        </div>

        {/* Aspect Ratio */}
        <div>
          <label className="block text-sm font-medium text-slate-200">Canvas Size</label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(Object.keys(ASPECT_RATIOS) as AspectRatio[]).map((r) => (
              <button
                key={r}
                onClick={() => setRatio(r)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  ratio === r
                    ? 'border-sky-500 bg-sky-500/10 text-sky-400'
                    : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600'
                }`}
              >
                {ASPECT_RATIOS[r].label}
              </button>
            ))}
          </div>
        </div>

        {/* Engraving Depth Boost */}
        <div>
          <label className="block text-sm font-medium text-slate-200">
            Engraving Depth Boost: {engravingDepthBoost}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={engravingDepthBoost}
            onChange={(e) => setEngravingDepthBoost(Number(e.target.value))}
            className="mt-2 w-full"
          />
          <p className="mt-1 text-xs text-slate-400">
            Increase until background is near black
          </p>
        </div>

        {/* Material Profile */}
        <div>
          <label className="block text-sm font-medium text-slate-200">Material Profile</label>
          <select
            value={materialProfile}
            onChange={(e) => setMaterialProfile(e.target.value as MaterialProfile)}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          >
            {Object.entries(MATERIAL_PROFILES).map(([key, { label, recommendedDepth }]) => (
              <option key={key} value={key}>
                {label} ({recommendedDepth})
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-400">
            Affects contrast, gamma, and detail processing
          </p>
        </div>

        {/* Depth Zones */}
        <div>
          <label className="block text-sm font-medium text-slate-200">
            Depth Zones: {depthZones}
          </label>
          <div className="mt-2 flex gap-2">
            {[3, 4, 5].map((zones) => (
              <button
                key={zones}
                onClick={() => setDepthZones(zones as DepthZones)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  depthZones === zones
                    ? 'border-sky-500 bg-sky-500/10 text-sky-400'
                    : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600'
                }`}
              >
                {zones}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {depthZones === 3 && 'Safe - fewer depth levels'}
            {depthZones === 4 && 'Default - balanced depth control'}
            {depthZones === 5 && 'Advanced - maximum depth detail'}
          </p>
        </div>

        {/* Invert Depth */}
        <div>
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={invertDepth}
              onChange={(e) => setInvertDepth(e.target.checked)}
              className="rounded"
            />
            Invert Depth
          </label>
          <p className="mt-1 text-xs text-slate-400">
            Enable if your laser engraves inverted depth
          </p>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="w-full rounded-lg bg-sky-500 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isGenerating ? 'Generating Height Map...' : 'Generate Engraving'}
        </button>

        {seed && (
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-3 text-xs text-slate-400">
            Seed: {seed}
          </div>
        )}

        {validationWarnings.length > 0 && (
          <div className="rounded-lg border border-yellow-700 bg-yellow-900/20 p-3">
            <p className="text-xs font-medium text-yellow-400">Auto-optimized for engraving:</p>
            {validationWarnings.map((warning, i) => (
              <p key={i} className="mt-1 text-xs text-yellow-300">• {warning}</p>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT PANEL - Preview and Tabs */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-800/50">
        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          <button
            onClick={() => setActiveTab('final')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'final'
                ? 'border-b-2 border-sky-500 text-sky-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Final Image
          </button>
          <button
            onClick={() => setActiveTab('depth')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'depth'
                ? 'border-b-2 border-sky-500 text-sky-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Depth Map (Main)
          </button>
          <button
            onClick={() => setActiveTab('layers')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'layers'
                ? 'border-b-2 border-sky-500 text-sky-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Layers (Coming Soon)
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'final' && (
            <div className="flex h-full items-center justify-center">
              {finalImage ? (
                <div className="max-w-full">
                  <p className="mb-2 text-xs text-slate-400">Preview only - not for engraving</p>
                  <img
                    src={`data:image/png;base64,${finalImage}`}
                    alt="Final preview"
                    className="max-h-[600px] rounded-lg border border-slate-700"
                  />
                </div>
              ) : (
                <p className="text-slate-500">Generate an image to see preview</p>
              )}
            </div>
          )}

          {activeTab === 'depth' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-100">Engraving Height Map</h3>
                <p className="text-sm text-slate-400">White = surface | Black = maximum depth</p>
              </div>

              {previewDataUrl ? (
                <>
                  {/* Preview Mode Toggle */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewMode('grayscale')}
                      className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                        viewMode === 'grayscale'
                          ? 'border-sky-500 bg-sky-500/10 text-sky-400'
                          : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      Grayscale
                    </button>
                    <button
                      onClick={() => setViewMode('false-color')}
                      className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                        viewMode === 'false-color'
                          ? 'border-sky-500 bg-sky-500/10 text-sky-400'
                          : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      False Color (Depth Zones)
                    </button>
                  </div>

                  {/* Depth Map Image - using previewDataUrl */}
                  <div className="flex justify-center">
                    <img
                      src={previewDataUrl}
                      alt="Depth map preview"
                      className="max-h-[500px] rounded-lg border border-slate-700"
                    />
                  </div>

                  {/* Histogram */}
                  {histBins && histBins.length > 0 ? (
                    <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                      <h4 className="mb-2 text-sm font-medium text-slate-200">Histogram Analysis</h4>
                      <div className="flex h-24 items-end gap-px">
                        {histBins.map((value, i) => (
                          <div
                            key={i}
                            className="flex-1 bg-sky-500/50"
                            style={{ height: `${(value / Math.max(...histBins)) * 100}%` }}
                          />
                        ))}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div
                          className={`rounded px-2 py-1 text-xs font-medium ${
                            histStatus === 'ready'
                              ? 'bg-green-900/50 text-green-400'
                              : histStatus === 'missingBlacks'
                              ? 'bg-yellow-900/50 text-yellow-400'
                              : 'bg-red-900/50 text-red-400'
                          }`}
                        >
                          {histStatus === 'ready' && '✓ Engraving ready'}
                          {histStatus === 'missingBlacks' && '⚠ Blacks missing'}
                          {histStatus === 'tooFlat' && '⚠ Too flat'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                      <p className="text-sm text-slate-400">No histogram data yet. Generate engraving first.</p>
                    </div>
                  )}

                  {/* Download Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={downloadHeightMap}
                      className="flex-1 rounded-lg bg-green-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-green-700"
                    >
                      Download Height Map PNG (Laser Ready)
                    </button>
                    <button
                      onClick={downloadPreview}
                      className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-slate-300 transition-colors hover:border-slate-600"
                    >
                      Download Preview PNG
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex h-[400px] items-center justify-center">
                  <p className="text-slate-500">Generate an engraving to see height map</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'layers' && (
            <div className="flex h-full items-center justify-center">
              <p className="text-slate-500">Layer decomposition coming soon...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useCallback, useState } from 'react';
import type { AspectRatio, BackgroundStyle, DepthStyle, PlaqueShape, ReliefMaterial, DepthZones } from '../types';
import { ASPECT_RATIOS, STYLE_PRESETS, PLAQUE_SHAPES, RELIEF_MATERIALS } from '../types';
import { useAnalytics } from '@/lib/analytics/useAnalytics';
import { useLanguage } from '@/lib/i18n/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';
import { refreshEntitlements } from '@/lib/entitlements/client';

type TabView = 'final' | 'depth' | 'layers';

const formatMessage = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? `{${key}}`));

function aspectRatioKey(ratio: AspectRatio) {
  switch (ratio) {
    case '1:1':
      return '1_1';
    case '4:5':
      return '4_5';
    case '16:9':
      return '16_9';
    case '9:16':
      return '9_16';
  }
}

export function AIDepthPhotoTool() {
  const analytics = useAnalytics('ai-depth-photo');
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);
  
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<DepthStyle>('bas-relief-engraving');
  const [ratio, setRatio] = useState<AspectRatio>('1:1');
  const [depthStrength, setDepthStrength] = useState(0.7);
  const [background] = useState<BackgroundStyle>('clean');
  const [activeTab, setActiveTab] = useState<TabView>('final');
  
  // Bas-Relief specific options
  const [plaqueShape, setPlaqueShape] = useState<PlaqueShape>('arch');
  const [reliefStrength, setReliefStrength] = useState(0.75);
  const [material, setMaterial] = useState<ReliefMaterial>('clay');
  const [bottomNotch, setBottomNotch] = useState(false);
  
  // V2 Engraving specific options
  const [engravingMaterial, setEngravingMaterial] = useState<ReliefMaterial>('wood');
  const [depthZones, setDepthZones] = useState<DepthZones>(3);
  const [detailLevel, setDetailLevel] = useState(0.5);
  const [enableValidation, setEnableValidation] = useState(true);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingDepth, setIsGeneratingDepth] = useState(false);
  const [finalImage, setFinalImage] = useState<string | null>(null);
  const [depthMap, setDepthMap] = useState<string | null>(null);
  const [invertDepth, setInvertDepth] = useState(false);
  const [seed, setSeed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasGeneratedOnce, setHasGeneratedOnce] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError(t('ai_depth_photo.errors.missing_prompt'));
      return;
    }

    setIsGenerating(true);
    setError(null);
    setFinalImage(null);
    setDepthMap(null);
    setSeed(null);
    
    // Track AI generation
    analytics.trackAIGeneration();

    try {
      const requestBody: any = {
        prompt: prompt.trim(),
        style,
        ratio,
        depthStrength,
        background,
      };

      // Add bas-relief options if style is bas-relief-engraving
      if (style === 'bas-relief-engraving') {
        requestBody.basReliefOptions = {
          plaqueShape,
          reliefStrength,
          material,
          bottomNotch,
        };
      }

      // Add V2 engraving options if style is bas-relief-engraving
      if (style === 'bas-relief-engraving') {
        requestBody.engravingOptions = {
          material: engravingMaterial,
          depthZones,
          detailLevel,
          enableValidation,
        };
      }

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
      setSeed(data.seed);
      setHasGeneratedOnce(true);
      setActiveTab('final');

      // Refresh credits in UI
      refreshEntitlements();

      // Auto-generate depth map
      generateDepthMap(data.imagePngBase64);
    } catch (error) {
      console.warn('[AI Generate] generation failed', error);
      setError(t('ai_depth_photo.errors.generate_failed'));
    } finally {
      setIsGenerating(false);
    }
  };

  const generateDepthMap = async (imageBase64: string) => {
    setIsGeneratingDepth(true);
    try {
      const response = await fetch('/api/ai/depth-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagePngBase64: imageBase64 }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate depth map');
      }

      const data = await response.json();
      setDepthMap(data.depthPngBase64);
      setInvertDepth(data.invertSuggested);
    } catch (error) {
      console.error('Depth map error:', error);
    } finally {
      setIsGeneratingDepth(false);
    }
  };

  const downloadImage = (base64: string, filename: string) => {
    // Track export
    analytics.trackExport();
    
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${base64}`;
    link.download = filename;
    link.click();
  };

  return (
    <div className="flex h-full gap-6">
      {/* Left Panel - Controls */}
      <div className="w-80 shrink-0 space-y-6 overflow-y-auto">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">{t('ai_depth_photo.photo_tool.title')}</h2>
          <p className="mt-1 text-sm text-slate-400">
            {t('ai_depth_photo.photo_tool.subtitle')}
          </p>
        </div>

        {/* Prompt */}
        <div>
          <label className="block text-sm font-medium text-slate-200">{t('ai_depth_photo.photo.prompt.label')}</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t('ai_depth_photo.photo.prompt.placeholder')}
            rows={4}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          />
        </div>

        {/* Style */}
        <div>
          <label className="block text-sm font-medium text-slate-200">{t('ai_depth_photo.photo.style.label')}</label>
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value as DepthStyle)}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          >
            {Object.entries(STYLE_PRESETS).map(([key, { label, description }]) => (
              <option key={key} value={key}>
                {t(`ai_depth_photo.presets.styles.${key}.label`)} - {t(`ai_depth_photo.presets.styles.${key}.description`)}
              </option>
            ))}
          </select>
        </div>

        {/* Aspect Ratio */}
        <div>
          <label className="block text-sm font-medium text-slate-200">{t('ai_depth_photo.photo.aspect_ratio.label')}</label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {Object.entries(ASPECT_RATIOS).map(([key, { label }]) => (
              <button
                key={key}
                onClick={() => setRatio(key as AspectRatio)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  ratio === key
                    ? 'border-sky-500 bg-sky-500/10 text-sky-400'
                    : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600'
                }`}
              >
                {t(`ai_depth_photo.presets.aspect_ratios.${aspectRatioKey(key as AspectRatio)}.label`)}
              </button>
            ))}
          </div>
        </div>

        {/* Depth Strength */}
        <div>
          <label className="block text-sm font-medium text-slate-200">
            {formatMessage(t('ai_depth_photo.photo.depth_strength.label'), { value: Math.round(depthStrength * 100) })}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={depthStrength}
            onChange={(e) => setDepthStrength(Number(e.target.value))}
            className="mt-2 w-full"
          />
        </div>


        {/* V2 Engraving Specific Controls */}
        {style === 'bas-relief-engraving' && (
          <>
            <div className="border-t border-slate-700 pt-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-200">{t('ai_depth_photo.photo.engraving_settings.title')}</h3>
              
              {/* Engraving Material */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-200">{t('ai_depth_photo.photo.engraving_material.label')}</label>
                <select
                  value={engravingMaterial}
                  onChange={(e) => setEngravingMaterial(e.target.value as ReliefMaterial)}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                >
                  {Object.entries(RELIEF_MATERIALS).map(([key, { label }]) => (
                    <option key={key} value={key}>
                      {t(`ai_depth_photo.presets.relief_materials.${key}.label`)}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-400">{t('ai_depth_photo.photo.engraving_material.helper')}</p>
              </div>

              {/* Depth Zones */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-200">
                  {formatMessage(t('ai_depth_photo.photo.depth_zones.label'), { value: depthZones })}
                </label>
                <div className="mt-2 flex gap-2">
                  {[2, 3, 4].map((zones) => (
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
                <p className="mt-1 text-xs text-slate-400">{t('ai_depth_photo.photo.depth_zones.helper')}</p>
              </div>

              {/* Detail Level */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-200">
                  {formatMessage(t('ai_depth_photo.photo.detail_level.label'), { value: Math.round(detailLevel * 100) })}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={detailLevel}
                  onChange={(e) => setDetailLevel(Number(e.target.value))}
                  className="mt-2 w-full"
                />
                <p className="mt-1 text-xs text-slate-400">{t('ai_depth_photo.photo.detail_level.helper')}</p>
              </div>

              {/* Validation Toggle */}
              <div>
                <label className="flex items-center gap-2 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={enableValidation}
                    onChange={(e) => setEnableValidation(e.target.checked)}
                    className="rounded"
                  />
                  {t('ai_depth_photo.photo.validation.label')}
                </label>
                <p className="mt-1 text-xs text-slate-400">{t('ai_depth_photo.photo.validation.helper')}</p>
              </div>
            </div>
          </>
        )}

        {/* Bas-Relief Cameo Specific Controls */}
        {style === 'bas-relief-engraving' && (
          <>
            <div className="border-t border-slate-700 pt-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-200">{t('ai_depth_photo.photo.bas_relief.title')}</h3>
              
              {/* Plaque Shape */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-200">{t('ai_depth_photo.photo.plaque_shape.label')}</label>
                <select
                  value={plaqueShape}
                  onChange={(e) => setPlaqueShape(e.target.value as PlaqueShape)}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                >
                  {Object.entries(PLAQUE_SHAPES).map(([key, { label }]) => (
                    <option key={key} value={key}>
                      {t(`ai_depth_photo.presets.plaque_shapes.${key}.label`)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Relief Strength */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-200">
                  {formatMessage(t('ai_depth_photo.photo.relief_strength.label'), { value: Math.round(reliefStrength * 100) })}
                </label>
                <input
                  type="range"
                  min="0.3"
                  max="1"
                  step="0.05"
                  value={reliefStrength}
                  onChange={(e) => setReliefStrength(Number(e.target.value))}
                  className="mt-2 w-full"
                />
              </div>

              {/* Material */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-200">{t('ai_depth_photo.photo.material.label')}</label>
                <select
                  value={material}
                  onChange={(e) => setMaterial(e.target.value as ReliefMaterial)}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                >
                  {Object.entries(RELIEF_MATERIALS).map(([key, { label }]) => (
                    <option key={key} value={key}>
                      {t(`ai_depth_photo.presets.relief_materials.${key}.label`)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bottom Notch */}
              <div>
                <label className="flex items-center gap-2 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={bottomNotch}
                    onChange={(e) => setBottomNotch(e.target.checked)}
                    className="rounded"
                  />
                  {t('ai_depth_photo.photo.bottom_notch.label')}
                </label>
                <p className="mt-1 text-xs text-slate-400">{t('ai_depth_photo.photo.bottom_notch.helper')}</p>
              </div>
            </div>
          </>
        )}

        {/* Generate Button */}
        {error && (
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-3 text-xs text-slate-300">{error}</div>
        )}

        <button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="w-full rounded-lg bg-sky-500 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isGenerating ? t('ai_depth_photo.generate.loading') : t('ai_depth_photo.generate.image')}
        </button>

        {(hasGeneratedOnce || !!error) && (
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full rounded-lg bg-slate-700 px-4 py-3 text-sm font-medium text-slate-100 transition-colors hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('ai_depth_photo.generate.regenerate')}
          </button>
        )}

        {seed && (
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-3 text-xs text-slate-400">
            {formatMessage(t('ai_depth_photo.seed'), { value: seed })}
          </div>
        )}
      </div>

      {/* Right Panel - Preview */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-700">
          <button
            onClick={() => setActiveTab('final')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'final'
                ? 'border-b-2 border-sky-500 text-sky-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            {t('ai_depth_photo.tabs.final')}
          </button>
          <button
            onClick={() => setActiveTab('depth')}
            disabled={!depthMap}
            className={`px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              activeTab === 'depth'
                ? 'border-b-2 border-sky-500 text-sky-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            {t('ai_depth_photo.tabs.depth')}
          </button>
          <button
            onClick={() => setActiveTab('layers')}
            disabled
            className="cursor-not-allowed px-4 py-2 text-sm font-medium text-slate-600"
          >
            {t('ai_depth_photo.tabs.layers')}
          </button>
        </div>

        {/* Preview Area */}
        <div className="flex flex-1 items-center justify-center overflow-hidden bg-slate-900/50 p-6">
          {activeTab === 'final' && finalImage && (
            <div className="flex flex-col items-center gap-4">
              <img
                src={`data:image/png;base64,${finalImage}`}
                alt={t('ai_depth_photo.preview.alt_final')}
                className="max-h-[600px] max-w-full rounded-lg shadow-lg"
              />
              <button
                onClick={() => downloadImage(finalImage, 'ai-depth-final.png')}
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-600"
              >
                {t('ai_depth_photo.download.final')}
              </button>

              <div className="text-xs text-slate-400">{t('ai_depth_photo.preview.refine')}</div>
            </div>
          )}

          {activeTab === 'depth' && depthMap && (
            <div className="flex flex-col items-center gap-4">
              <div className="flex flex-col gap-2">
                <img
                  src={`data:image/png;base64,${depthMap}`}
                  alt={t('ai_depth_photo.preview.alt_depth')}
                  className="max-h-[600px] max-w-full rounded-lg shadow-lg"
                  style={invertDepth ? { filter: 'invert(1)' } : undefined}
                />
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={invertDepth}
                    onChange={(e) => setInvertDepth(e.target.checked)}
                    className="rounded"
                  />
                  {t('ai_depth_photo.invert_depth.label')}
                </label>
              </div>
              <button
                onClick={() => downloadImage(depthMap, 'ai-depth-map.png')}
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-600"
              >
                {t('ai_depth_photo.download.depth_map')}
              </button>

              <div className="text-xs text-slate-400">{t('ai_depth_photo.preview.refine')}</div>
            </div>
          )}

          {!finalImage && !isGenerating && (
            <div className="text-center text-slate-500">
              <p>{t('ai_depth_photo.preview.empty_prompt')}</p>
            </div>
          )}

          {isGenerating && (
            <div className="text-center text-slate-400">
              <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-sky-500" />
              <p>{t('ai_depth_photo.generate.loading')}</p>
            </div>
          )}

          {isGeneratingDepth && activeTab === 'depth' && (
            <div className="text-center text-slate-400">
              <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-sky-500" />
              <p>{t('ai_depth_photo.generate.loading')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

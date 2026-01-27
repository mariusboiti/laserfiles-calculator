'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '@/app/(app)/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';
import {
  Download,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  LayoutGrid,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Type,
  Circle,
  Settings2,
  Palette,
  Wand2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
} from 'lucide-react';

import type { SignConfigV3, SignShapeV3, HolePreset, CurvedMode, TextTransform, OutputMode, IconPlacement, MonogramConfig } from '../types/signV3';
import { DEFAULTS_V3, LIMITS, SHAPE_OPTIONS, HOLE_PRESETS, FONT_FAMILIES, FONT_WEIGHTS, SHEET_PRESETS, sanitizeConfig, clamp } from '../config/defaultsV3';
import { ICON_LIBRARY, getIconsByCategory } from '../core/iconsV3';
import { renderPreviewSvg, renderExportSvg, renderSheetSvg, renderDesignSvg, generateFilename } from '../core/renderV3';
import { generateSignFromPrompt } from '../core/aiStubV3';

interface Props {
  featureFlags?: { isProUser?: boolean };
}

export default function PersonalisedSignToolV3({ featureFlags }: Props) {
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  const [config, setConfig] = useState<SignConfigV3>(DEFAULTS_V3);
  const [showGuides, setShowGuides] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    shape: true,
    text: true,
    holes: false,
    decoration: false,
    output: false,
    sheet: false,
    ai: false,
  });
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [zoom, setZoom] = useState(1);

  const updateConfig = useCallback((updates: Partial<SignConfigV3>) => {
    setConfig((prev) => sanitizeConfig({ ...prev, ...updates }));
  }, []);

  const updateText = useCallback((line: 'line1' | 'line2' | 'line3', updates: Partial<SignConfigV3['text']['line1']>) => {
    setConfig((prev) => ({
      ...prev,
      text: {
        ...prev.text,
        [line]: { ...prev.text[line], ...updates },
      },
    }));
  }, []);

  const updateHoles = useCallback((updates: Partial<SignConfigV3['holes']>) => {
    setConfig((prev) => ({
      ...prev,
      holes: { ...prev.holes, ...updates },
    }));
  }, []);

  const updateIcon = useCallback((updates: Partial<SignConfigV3['icon']>) => {
    setConfig((prev) => ({
      ...prev,
      icon: { ...prev.icon, ...updates },
    }));
  }, []);

  const updateSheet = useCallback((updates: Partial<SignConfigV3['sheet']>) => {
    setConfig((prev) => ({
      ...prev,
      sheet: { ...prev.sheet, ...updates },
    }));
  }, []);

  const updateOutput = useCallback((updates: Partial<SignConfigV3['output']>) => {
    setConfig((prev) => ({
      ...prev,
      output: { ...prev.output, ...updates },
    }));
  }, []);

  const updateMonogram = useCallback((updates: Partial<MonogramConfig>) => {
    setConfig((prev) => ({
      ...prev,
      monogram: { ...prev.monogram, ...updates },
    }));
  }, []);

  const handleReset = useCallback(() => {
    setConfig(DEFAULTS_V3);
    setAiPrompt('');
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const result = useMemo(() => {
    return renderPreviewSvg(config, {
      showGuides,
      showSafeZones: showGuides,
      showTextBoxes: showGuides,
      showHolesGuides: showGuides,
      showGrid: showGuides,
    });
  }, [config, showGuides]);

  const handleExport = useCallback(() => {
    const exportResult = config.sheet.enabled ? renderSheetSvg(config) : renderExportSvg(config);
    const blob = new Blob([exportResult.svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = generateFilename(config);
    a.click();
    URL.revokeObjectURL(url);
  }, [config]);

  const handleAiGenerate = useCallback(async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const result = await generateSignFromPrompt({ prompt: aiPrompt, generateVariations: false });
      setConfig((prev) => sanitizeConfig({ ...prev, ...result.config }));
    } finally {
      setAiLoading(false);
    }
  }, [aiPrompt]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 min-h-0">
      {/* Controls Panel */}
      <div className="w-full lg:w-[400px] lg:min-w-[400px] lg:flex-shrink-0 space-y-4 overflow-y-auto max-h-[calc(100vh-120px)]">
        {/* Shape Section */}
        <Section title={t('personalised_sign.v3.sections.shape')} icon={<Circle className="w-4 h-4" />} expanded={expandedSections.shape} onToggle={() => toggleSection('shape')}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">{t('personalised_sign.v3.shape_type')}</label>
              <select
                value={config.shape}
                onChange={(e) => updateConfig({ shape: e.target.value as SignShapeV3 })}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm"
              >
                {SHAPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <NumberInput label={t('personalised_sign.common.width_mm')} value={config.width} onChange={(v) => updateConfig({ width: v })} min={LIMITS.width.min} max={LIMITS.width.max} />
              <NumberInput label={t('personalised_sign.common.height_mm')} value={config.height} onChange={(v) => updateConfig({ height: v })} min={LIMITS.height.min} max={LIMITS.height.max} />
            </div>

            {(config.shape === 'rounded-rect' || config.shape === 'rounded-arch' || config.shape === 'plaque') && (
              <NumberInput label={t('personalised_sign.v3.corner_radius')} value={config.cornerRadius} onChange={(v) => updateConfig({ cornerRadius: v })} min={0} max={LIMITS.cornerRadius.max} />
            )}

            <div className="flex items-center gap-2">
              <input type="checkbox" checked={config.borderEnabled} onChange={(e) => updateConfig({ borderEnabled: e.target.checked })} className="rounded" />
              <span className="text-xs text-slate-300">{t('personalised_sign.v3.show_border')}</span>
              {config.borderEnabled && (
                <NumberInput label="" value={config.borderWidth} onChange={(v) => updateConfig({ borderWidth: v })} min={0.5} max={10} step={0.5} className="w-20 ml-auto" />
              )}
            </div>
          </div>
        </Section>

        {/* Text Section */}
        <Section title={t('personalised_sign.v3.sections.text')} icon={<Type className="w-4 h-4" />} expanded={expandedSections.text} onToggle={() => toggleSection('text')}>
          <div className="space-y-4">
            <TextLineControls label={t('personalised_sign.v3.text.line1_top')} line="line1" config={config.text.line1} onChange={(u) => updateText('line1', u)} />
            <TextLineControls label={t('personalised_sign.v3.text.line2_main')} line="line2" config={config.text.line2} onChange={(u) => updateText('line2', u)} />
            
            {/* Curved Text for Line 2 */}
            <div className="pl-3 border-l-2 border-slate-700 space-y-2">
              <label className="block text-xs text-slate-400">{t('personalised_sign.v3.text.curved_text')}</label>
              <div className="flex gap-2">
                {(['straight', 'arcUp', 'arcDown'] as CurvedMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setConfig((prev) => ({ ...prev, text: { ...prev.text, curvedModeLine2: mode } }))}
                    className={`px-2 py-1 text-xs rounded ${config.text.curvedModeLine2 === mode ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}
                  >
                    {mode === 'straight'
                      ? t('personalised_sign.v3.text.curved_mode.straight')
                      : mode === 'arcUp'
                        ? t('personalised_sign.v3.text.curved_mode.arc_up')
                        : t('personalised_sign.v3.text.curved_mode.arc_down')}
                  </button>
                ))}
              </div>
              {config.text.curvedModeLine2 !== 'straight' && (
                <NumberInput label={t('personalised_sign.v3.text.curve_intensity')} value={config.text.curvedIntensity} onChange={(v) => setConfig((prev) => ({ ...prev, text: { ...prev.text, curvedIntensity: v } }))} min={0} max={100} />
              )}
            </div>

            <TextLineControls label={t('personalised_sign.v3.text.line3_bottom')} line="line3" config={config.text.line3} onChange={(u) => updateText('line3', u)} />

            <NumberInput label={t('personalised_sign.v3.text.line_height')} value={config.text.lineHeight} onChange={(v) => setConfig((prev) => ({ ...prev, text: { ...prev.text, lineHeight: v } }))} min={0.8} max={1.6} step={0.1} />
            <NumberInput label={t('personalised_sign.v3.padding_mm')} value={config.padding} onChange={(v) => updateConfig({ padding: v })} min={0} max={60} />
          </div>
        </Section>

        {/* Holes Section */}
        <Section title={t('personalised_sign.v3.sections.holes')} icon={<Circle className="w-4 h-4" />} expanded={expandedSections.holes} onToggle={() => toggleSection('holes')}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">{t('personalised_sign.v3.holes.preset')}</label>
              <select value={config.holes.preset} onChange={(e) => updateHoles({ preset: e.target.value as HolePreset })} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm">
                {HOLE_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            {config.holes.preset !== 'none' && (
              <>
                <NumberInput label={t('personalised_sign.v3.holes.diameter_mm')} value={config.holes.diameter} onChange={(v) => updateHoles({ diameter: v })} min={2} max={20} />
                <NumberInput label={t('personalised_sign.v3.holes.margin_mm')} value={config.holes.margin} onChange={(v) => updateHoles({ margin: v })} min={0} max={60} />
                {config.holes.preset === 'slots' && (
                  <>
                    <NumberInput label={t('personalised_sign.v3.holes.slot_length_mm')} value={config.holes.slotLength || 15} onChange={(v) => updateHoles({ slotLength: v })} min={5} max={30} />
                    <NumberInput label={t('personalised_sign.v3.holes.slot_width_mm')} value={config.holes.slotWidth || 4} onChange={(v) => updateHoles({ slotWidth: v })} min={2} max={10} />
                  </>
                )}
              </>
            )}
          </div>
        </Section>

        {/* Decoration Section */}
        <Section title={t('personalised_sign.v3.sections.decoration')} icon={<Palette className="w-4 h-4" />} expanded={expandedSections.decoration} onToggle={() => toggleSection('decoration')}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">{t('personalised_sign.v3.decoration.icon')}</label>
              <select value={config.icon.id || ''} onChange={(e) => updateIcon({ id: e.target.value || null })} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm">
                <option value="">{t('personalised_sign.common.none')}</option>
                {ICON_LIBRARY.map((icon) => (
                  <option key={icon.id} value={icon.id}>{icon.name}</option>
                ))}
              </select>
            </div>
            {config.icon.id && (
              <>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t('personalised_sign.v3.decoration.placement')}</label>
                  <select value={config.icon.placement} onChange={(e) => updateIcon({ placement: e.target.value as IconPlacement })} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm">
                    <option value="left-of-line2">{t('personalised_sign.v3.decoration.placement.left_of_line2')}</option>
                    <option value="right-of-line2">{t('personalised_sign.v3.decoration.placement.right_of_line2')}</option>
                    <option value="above-line2">{t('personalised_sign.v3.decoration.placement.above_line2')}</option>
                    <option value="between-lines">{t('personalised_sign.v3.decoration.placement.between_lines')}</option>
                  </select>
                </div>
                <NumberInput label={t('personalised_sign.v3.decoration.size_mm')} value={config.icon.size} onChange={(v) => updateIcon({ size: v })} min={5} max={100} />
              </>
            )}

            {/* Monogram */}
            <div className="border-t border-slate-700 pt-3 mt-3">
              <div className="flex items-center gap-2 mb-2">
                <input type="checkbox" checked={config.monogram.enabled} onChange={(e) => updateMonogram({ enabled: e.target.checked })} className="rounded" />
                <span className="text-xs text-slate-300">{t('personalised_sign.v3.monogram.enable')}</span>
              </div>
              {config.monogram.enabled && (
                <div className="space-y-2 pl-4">
                  <input
                    type="text"
                    value={config.monogram.text}
                    onChange={(e) => updateMonogram({ text: e.target.value.slice(0, 3) })}
                    placeholder={t('personalised_sign.v3.monogram.placeholder')}
                    maxLength={3}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm"
                  />
                  <NumberInput label={t('personalised_sign.v3.monogram.size_mm')} value={config.monogram.size} onChange={(v) => updateMonogram({ size: v })} min={10} max={150} />
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">{t('personalised_sign.v3.monogram.position')}</label>
                    <select value={config.monogram.placement} onChange={(e) => updateMonogram({ placement: e.target.value as 'top' | 'center' | 'bottom' })} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm">
                      <option value="top">{t('personalised_sign.v3.monogram.position.top')}</option>
                      <option value="center">{t('personalised_sign.v3.monogram.position.center')}</option>
                      <option value="bottom">{t('personalised_sign.v3.monogram.position.bottom')}</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Section>

        {/* Output Section */}
        <Section title={t('personalised_sign.v3.sections.output')} icon={<Settings2 className="w-4 h-4" />} expanded={expandedSections.output} onToggle={() => toggleSection('output')}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">{t('personalised_sign.v3.output.output_mode')}</label>
              <div className="flex gap-2">
                {(['both', 'cut', 'engrave'] as OutputMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => updateOutput({ mode })}
                    className={`px-3 py-1.5 text-xs rounded ${config.output.mode === mode ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}
                  >
                    {mode === 'both'
                      ? t('personalised_sign.v3.output.mode.both')
                      : mode === 'cut'
                        ? t('personalised_sign.v3.output.mode.cut')
                        : t('personalised_sign.v3.output.mode.engrave')}
                  </button>
                ))}
              </div>
            </div>
            <NumberInput label={t('personalised_sign.v3.output.cut_stroke_width')} value={config.output.cutStrokeWidth} onChange={(v) => updateOutput({ cutStrokeWidth: v })} min={0.01} max={0.5} step={0.01} />
            <NumberInput label={t('personalised_sign.v3.output.engrave_stroke_width')} value={config.output.engraveStrokeWidth} onChange={(v) => updateOutput({ engraveStrokeWidth: v })} min={0.01} max={0.5} step={0.01} />
          </div>
        </Section>

        {/* Sheet Section */}
        <Section title={t('personalised_sign.v3.sections.sheet')} icon={<LayoutGrid className="w-4 h-4" />} expanded={expandedSections.sheet} onToggle={() => toggleSection('sheet')}>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={config.sheet.enabled} onChange={(e) => updateSheet({ enabled: e.target.checked })} className="rounded" />
              <span className="text-xs text-slate-300">{t('personalised_sign.v3.sheet.enable')}</span>
            </div>
            {config.sheet.enabled && (
              <>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t('personalised_sign.v3.sheet.sheet_preset')}</label>
                  <select
                    onChange={(e) => {
                      const preset = SHEET_PRESETS.find((p) => p.name === e.target.value);
                      if (preset) updateSheet({ width: preset.width, height: preset.height });
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm"
                  >
                    <option value="">{t('personalised_sign.v3.sheet.custom')}</option>
                    {SHEET_PRESETS.map((p) => (
                      <option key={p.name} value={p.name}>{p.name} ({p.width}×{p.height}mm)</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <NumberInput label={t('personalised_sign.common.width_mm')} value={config.sheet.width} onChange={(v) => updateSheet({ width: v })} min={100} max={3000} />
                  <NumberInput label={t('personalised_sign.common.height_mm')} value={config.sheet.height} onChange={(v) => updateSheet({ height: v })} min={100} max={2000} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <NumberInput label={t('personalised_sign.v3.sheet.margin_mm')} value={config.sheet.margin} onChange={(v) => updateSheet({ margin: v })} min={0} max={50} />
                  <NumberInput label={t('personalised_sign.v3.sheet.spacing_mm')} value={config.sheet.spacing} onChange={(v) => updateSheet({ spacing: v })} min={0} max={50} />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={config.sheet.autoFill} onChange={(e) => updateSheet({ autoFill: e.target.checked })} className="rounded" />
                  <span className="text-xs text-slate-300">{t('personalised_sign.v3.sheet.auto_fill')}</span>
                </div>
              </>
            )}
          </div>
        </Section>

        {/* AI Section */}
        <Section title={t('personalised_sign.v3.sections.ai')} icon={<Wand2 className="w-4 h-4" />} expanded={expandedSections.ai} onToggle={() => toggleSection('ai')}>
          <div className="space-y-3">
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder={t('personalised_sign.v3.ai.placeholder')}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm min-h-[80px] resize-none"
            />
            <button
              onClick={handleAiGenerate}
              disabled={aiLoading || !aiPrompt.trim()}
              className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 rounded text-sm font-medium flex items-center justify-center gap-2"
            >
              {aiLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {aiLoading ? t('personalised_sign.v3.ai.generating') : t('personalised_sign.v3.ai.generate_sign')}
            </button>
          </div>
        </Section>
      </div>

      {/* Preview Panel */}
      <div className="flex-1 min-w-0 space-y-3 overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 bg-slate-800 rounded-lg px-4 py-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGuides(!showGuides)}
              className={`px-3 py-1.5 text-xs rounded flex items-center gap-1 ${showGuides ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}
            >
              {showGuides ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              {t('personalised_sign.v3.preview.guides')}
            </button>
            
            {/* Zoom Slider */}
            <div className="h-4 w-px bg-slate-600" />
            <div className="flex items-center gap-2">
              <ZoomOut className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="range"
                min="25"
                max="300"
                step="10"
                value={zoom * 100}
                onChange={(e) => setZoom(Number(e.target.value) / 100)}
                className="w-32 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((zoom * 100 - 25) / 275) * 100}%, #334155 ${((zoom * 100 - 25) / 275) * 100}%, #334155 100%)`
                }}
              />
              <ZoomIn className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-400 w-12 text-center">{Math.round(zoom * 100)}%</span>
            </div>
          </div>
          <div className="text-xs text-slate-400">
            {config.width} × {config.height} mm
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm font-medium flex items-center gap-2"
              title={t('personalised_sign.v3.preview.reset_title')}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                const designResult = renderDesignSvg(config);
                const blob = new Blob([designResult.svg], { type: 'image/svg+xml' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = generateFilename(config).replace('.svg', '-design.svg');
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm font-medium flex items-center gap-2"
              title={t('personalised_sign.v3.preview.export_with_guides_title')}
            >
              <Eye className="w-4 h-4" />
              {t('personalised_sign.v3.preview.design')}
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-1.5 bg-green-600 hover:bg-green-500 rounded text-sm font-medium flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {t('personalised_sign.common.export_svg')}
            </button>
          </div>
        </div>

        {/* Warnings */}
        {result.warnings.length > 0 && (
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 flex-shrink-0">
            <div className="flex items-center gap-2 text-yellow-400 text-sm font-medium mb-1">
              <AlertTriangle className="w-4 h-4" />
              {t('personalised_sign.v3.preview.warnings')}
            </div>
            <ul className="text-xs text-yellow-300/80 space-y-1">
              {result.warnings.map((w, i) => (
                <li key={i}>• {w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* SVG Preview - Canvas with zoom */}
        <div className="flex-1 bg-slate-900 rounded-lg border border-slate-700 overflow-auto flex items-center justify-center p-4" style={{ minHeight: '400px' }}>
          <div
            className="bg-white rounded shadow-lg p-6 transition-transform"
            style={{ 
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
            }}
          >
            <div
              className="sign-preview-svg"
              style={{
                width: `${config.width * 2}px`,
                height: `${config.height * 2}px`,
              }}
              dangerouslySetInnerHTML={{ 
                __html: result.svg
                  .replace(/width="[^"]*mm"/, `width="100%"`)
                  .replace(/height="[^"]*mm"/, `height="100%"`)
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ Helper Components ============

function Section({ title, icon, expanded, onToggle, children }: { title: string; icon: React.ReactNode; expanded: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700">
      <button onClick={onToggle} className="w-full px-4 py-3 flex items-center justify-between text-left">
        <span className="flex items-center gap-2 text-sm font-medium text-slate-200">
          {icon}
          {title}
        </span>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {expanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function NumberInput({ label, value, onChange, min, max, step = 1, className = '' }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; className?: string }) {
  const [text, setText] = useState<string>(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  return (
    <div className={className}>
      {label && <label className="block text-xs text-slate-400 mb-1">{label}</label>}
      <input
        type="number"
        value={text}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          const v = Number(next);
          if (Number.isFinite(v)) onChange(v);
        }}
        onBlur={() => {
          const v = Number(text);
          if (!Number.isFinite(v)) {
            setText(String(value));
            return;
          }
          const clamped = Math.max(min ?? -Infinity, Math.min(max ?? Infinity, v));
          if (clamped !== v) {
            onChange(clamped);
          }
          setText(String(clamped));
        }}
        min={min}
        max={max}
        step={step}
        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm"
      />
    </div>
  );
}

function TextLineControls({ label, line, config, onChange }: { label: string; line: string; config: SignConfigV3['text']['line1']; onChange: (u: Partial<SignConfigV3['text']['line1']>) => void }) {
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  return (
    <div className="space-y-2">
      <label className="block text-xs text-slate-400">{label}</label>
      <input
        type="text"
        value={config.text}
        onChange={(e) => onChange({ text: e.target.value })}
        placeholder={`${t('personalised_sign.v3.text_controls.enter_prefix')} ${label.toLowerCase()}`}
        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm"
      />
      
      {/* Custom Font Input */}
      <div>
        <label className="block text-[10px] text-slate-400 mb-1">{t('personalised_sign.v3.text_controls.font_family')}</label>
        <input
          type="text"
          value={config.fontFamily}
          onChange={(e) => onChange({ fontFamily: e.target.value })}
          placeholder={t('personalised_sign.v3.text_controls.font_family_placeholder')}
          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <NumberInput
          label={t('personalised_sign.v3.text_controls.font_size')}
          value={config.fontSize}
          onChange={(v) => onChange({ fontSize: v })}
          min={5}
          max={150}
          step={1}
        />
        <select value={config.weight} onChange={(e) => onChange({ weight: e.target.value as any })} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs mt-5">
          {FONT_WEIGHTS.map((w) => (
            <option key={w.value} value={w.value}>{w.label}</option>
          ))}
        </select>
      </div>
      
      {/* Horizontal Alignment */}
      <div>
        <label className="block text-[10px] text-slate-400 mb-1">{t('personalised_sign.v3.text_controls.horizontal_align')}</label>
        <div className="flex gap-1">
          <button
            onClick={() => onChange({ offsetX: -150 })}
            className="flex-1 p-2 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 flex items-center justify-center"
            title={t('personalised_sign.v3.text_controls.align_left')}
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => onChange({ offsetX: 0 })}
            className="flex-1 p-2 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 flex items-center justify-center"
            title={t('personalised_sign.v3.text_controls.align_center')}
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            onClick={() => onChange({ offsetX: 150 })}
            className="flex-1 p-2 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 flex items-center justify-center"
            title={t('personalised_sign.v3.text_controls.align_right')}
          >
            <AlignRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Offset X Slider */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] text-slate-400">{t('personalised_sign.v3.text_controls.offset_x')}</label>
          <span className="text-[10px] text-slate-300">{config.offsetX || 0} mm</span>
        </div>
        <input
          type="range"
          min="-200"
          max="200"
          step="1"
          value={config.offsetX || 0}
          onChange={(e) => onChange({ offsetX: Number(e.target.value) })}
          className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
        />
      </div>
      
      {/* Vertical Alignment */}
      <div>
        <label className="block text-[10px] text-slate-400 mb-1">{t('personalised_sign.v3.text_controls.vertical_align')}</label>
        <div className="flex gap-1">
          <button
            onClick={() => onChange({ offsetY: -60 })}
            className="flex-1 p-2 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 flex items-center justify-center"
            title={t('personalised_sign.v3.text_controls.align_top')}
          >
            <AlignVerticalJustifyStart className="w-4 h-4" />
          </button>
          <button
            onClick={() => onChange({ offsetY: 0 })}
            className="flex-1 p-2 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 flex items-center justify-center"
            title={t('personalised_sign.v3.text_controls.align_middle')}
          >
            <AlignVerticalJustifyCenter className="w-4 h-4" />
          </button>
          <button
            onClick={() => onChange({ offsetY: 60 })}
            className="flex-1 p-2 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 flex items-center justify-center"
            title={t('personalised_sign.v3.text_controls.align_bottom')}
          >
            <AlignVerticalJustifyEnd className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Offset Y Slider */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] text-slate-400">{t('personalised_sign.v3.text_controls.offset_y')}</label>
          <span className="text-[10px] text-slate-300">{config.offsetY || 0} mm</span>
        </div>
        <input
          type="range"
          min="-200"
          max="200"
          step="1"
          value={config.offsetY || 0}
          onChange={(e) => onChange({ offsetY: Number(e.target.value) })}
          className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
        />
      </div>
      
      <div className="flex items-center gap-2">
        <select value={config.transform} onChange={(e) => onChange({ transform: e.target.value as TextTransform })} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs flex-1">
          <option value="none">{t('personalised_sign.common.none')}</option>
          <option value="upper">{t('personalised_sign.v3.text_controls.transform.upper')}</option>
          <option value="lower">{t('personalised_sign.v3.text_controls.transform.lower')}</option>
          <option value="title">{t('personalised_sign.v3.text_controls.transform.title')}</option>
        </select>
        <NumberInput label="" value={config.letterSpacing} onChange={(v) => onChange({ letterSpacing: v })} min={-10} max={20} step={0.5} className="w-20" />
      </div>
    </div>
  );
}

'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { useToolUx } from '@/components/ux/ToolUxProvider';
import { downloadTextFile } from '@/lib/studio/export/download';
import { DEFAULTS, SHEET_PRESETS } from '../config/defaults';
import { parseSvgSize } from '../core/parseSvgSize';
import { BUILT_IN_TEMPLATES } from '../core/builtInTemplates';
import { buildLayoutsV2 } from '../core/layoutEngine';
import { validateLayout } from '../core/validateLayout';
import { generateSheetSvg, generateSheetFilename, generateZipFilename } from '../core/exportSvg';
import { generateZipExport, downloadZip } from '../core/exportZip';
import type { TemplateItem, LayoutSettings, SheetLayout } from '../types/layout';
import { createArtifact, addToPriceCalculator } from '@/lib/artifacts/client';
import { useLanguage } from '@/lib/i18n/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';
import { useUnitSystem } from '@/components/units/UnitSystemProvider';
import { fromDisplayLength, toDisplayLength } from '@/components/units/length';

interface OrnamentLayoutToolProps {
  onResetCallback?: (callback: () => void) => void;
  onGetExportPayload?: (getExportPayload: () => Promise<{ svg: string; name?: string; meta?: any }> | { svg: string; name?: string; meta?: any }) => void;
}

export function OrnamentLayoutTool({ onResetCallback, onGetExportPayload }: OrnamentLayoutToolProps) {
  const { api } = useToolUx();
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);
  const { unitSystem } = useUnitSystem();

  useEffect(() => {
    api.setIsEmpty(false);
  }, [api]);

  // Templates
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [activeBuiltInKey, setActiveBuiltInKey] = useState<string | null>(null);
  
  // Settings
  const [settings, setSettings] = useState<LayoutSettings>(DEFAULTS);
  
  // UI state
  const [currentSheetIndex, setCurrentSheetIndex] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  const lenStep = unitSystem === 'in' ? 0.01 : 0.1;

  // Generate layout
  const layoutResult = useMemo(() => {
    if (templates.length === 0) {
      return { sheets: [], summaryWarnings: [], errors: [t('ornament_layout.ui.errors.no_templates_loaded')] };
    }

    const result = buildLayoutsV2({ templates, settings });
    

    // Validate
    const validation = validateLayout(result.sheets, settings);
    result.summaryWarnings.push(...validation.warnings);
    result.errors.push(...validation.errors);

    return result;
  }, [templates, settings]);

  // Current sheet for preview
  const currentSheet = useMemo(() => {
    return layoutResult.sheets.find((s) => s.sheetIndex === currentSheetIndex);
  }, [layoutResult.sheets, currentSheetIndex]);

  // Preview SVG
  const previewSvg = useMemo(() => {
    if (!currentSheet) {
      const w = Number(settings.sheetW) || 300;
      const h = Number(settings.sheetH) || 200;
      const vb = `0 0 ${w} ${h}`;
      return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${w}mm" height="${h}mm">
  <rect x="0" y="0" width="${w}" height="${h}" fill="#ffffff" />
  <rect x="0.5" y="0.5" width="${Math.max(0, w - 1)}" height="${Math.max(0, h - 1)}" fill="none" stroke="#94a3b8" stroke-width="1" />
</svg>
      `.trim();
    }
    
    return generateSheetSvg({
      sheetIndex: currentSheet.sheetIndex,
      sheet: currentSheet,
      templates,
      settings: {
        ...settings,
      },
    });
  }, [currentSheet, templates, settings]);

  const getExportPayload = useCallback(() => {
    const sheet = currentSheet;
    const sheetW = settings.sheetW;
    const sheetH = settings.sheetH;
    const name = sheet
      ? generateSheetFilename(sheet.sheetIndex, layoutResult.sheets.length, sheet.items.length, settings)
      : t('ornament_layout.ui.ornament_layout_svg_filename');
    return {
      svg: previewSvg,
      name,
      meta: {
        bboxMm: { width: sheetW, height: sheetH },
        sheetIndex: sheet?.sheetIndex,
        totalSheets: layoutResult.sheets.length,
      },
    };
  }, [currentSheet, layoutResult.sheets.length, previewSvg, settings, t]);

  useEffect(() => {
    onGetExportPayload?.(getExportPayload);
  }, [getExportPayload, onGetExportPayload]);

  // Reset
  const resetToDefaults = useCallback(() => {
    setTemplates([]);
    setSettings(DEFAULTS);
    setCurrentSheetIndex(1);
    setActiveBuiltInKey(null);
  }, []);

  useEffect(() => {
    if (onResetCallback) {
      onResetCallback(resetToDefaults);
    }
  }, [onResetCallback, resetToDefaults]);

  // Regenerate template when hole settings change
  useEffect(() => {
    if (!activeBuiltInKey) return;
    
    const regenerateTemplate = async () => {
      const tpl = BUILT_IN_TEMPLATES.find((t) => t.key === activeBuiltInKey);
      if (!tpl || !tpl.hasHole) return;

      try {
        const { generateTemplateWithHole } = await import('../core/builtInTemplates');
        const dynamicTpl = generateTemplateWithHole(activeBuiltInKey, settings.holeRadius, settings.holeYOffset);
        if (!dynamicTpl) return;

        const parsed = parseSvgSize(dynamicTpl.svgText, {
          pxDpi: settings.pxDpi,
          sanitize: settings.sanitizeSvg,
        });

        setTemplates((prev) => {
          const activeTemplate = prev.find((t) => t.id === settings.activeTemplateId);
          if (!activeTemplate) return prev;

          return prev.map((t) => 
            t.id === settings.activeTemplateId
              ? {
                  ...t,
                  svgText: dynamicTpl.svgText,
                  innerSvg: parsed.innerSvg,
                  width: parsed.width,
                  height: parsed.height,
                  viewBox: parsed.viewBox,
                }
              : t
          );
        });
      } catch (error) {
        console.error(t('ornament_layout.ui.errors.failed_to_regenerate_template'), error);
      }
    };

    regenerateTemplate();
  }, [settings.holeRadius, settings.holeYOffset, activeBuiltInKey, settings.pxDpi, settings.sanitizeSvg, settings.activeTemplateId]);

  // Add template
  const handleAddTemplate = useCallback(async (file: File) => {
    try {
      const svgText = await file.text();
      const parsed = parseSvgSize(svgText, {
        pxDpi: settings.pxDpi,
        sanitize: settings.sanitizeSvg,
      });

      const newTemplate: TemplateItem = {
        id: `tpl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        svgText,
        innerSvg: parsed.innerSvg,
        width: parsed.width,
        height: parsed.height,
        viewBox: parsed.viewBox,
        qty: 1,
        rotateDeg: 0,
      };

      setTemplates((prev) => [...prev, newTemplate]);
      setSettings((s) => ({ ...s, activeTemplateId: newTemplate.id }));
      setActiveBuiltInKey(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : t('ornament_layout.ui.errors.failed_to_load_svg'));
    }
  }, [settings.pxDpi, settings.sanitizeSvg, t]);

  const handleAddBuiltInTemplate = useCallback(async (key: string) => {
    const tpl = BUILT_IN_TEMPLATES.find((t) => t.key === key);
    if (!tpl) return;

    try {
      // Use dynamic template with hole settings if template has hole
      let svgText = tpl.svgText;
      if (tpl.hasHole) {
        const { generateTemplateWithHole } = await import('../core/builtInTemplates');
        const dynamicTpl = generateTemplateWithHole(key, settings.holeRadius, settings.holeYOffset);
        if (dynamicTpl) {
          svgText = dynamicTpl.svgText;
        }
      }

      const parsed = parseSvgSize(svgText, {
        pxDpi: settings.pxDpi,
        sanitize: settings.sanitizeSvg,
      });

      const newTemplate: TemplateItem = {
        id: `tpl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: `${t(tpl.name)}.svg`,
        svgText,
        innerSvg: parsed.innerSvg,
        width: parsed.width,
        height: parsed.height,
        viewBox: parsed.viewBox,
        qty: 1,
        rotateDeg: 0,
      };

      setTemplates((prev) => [...prev, newTemplate]);
      setSettings((s) => ({ ...s, activeTemplateId: newTemplate.id }));
      setActiveBuiltInKey(key);
    } catch (error) {
      alert(error instanceof Error ? error.message : t('ornament_layout.ui.errors.failed_to_load_built_in_template'));
    }
  }, [settings.pxDpi, settings.sanitizeSvg, settings.holeRadius, settings.holeYOffset, t]);

  // Remove template
  const handleRemoveTemplate = useCallback((id: string) => {
    setTemplates((prev) => {
      const next = prev.filter((t) => t.id !== id);

      setSettings((s) => {
        if (s.activeTemplateId !== id) return s;
        return {
          ...s,
          activeTemplateId: next[0]?.id,
        };
      });

      setActiveBuiltInKey(null);
      return next;
    });
  }, []);

  // Update template
  const handleUpdateTemplate = useCallback((id: string, updates: Partial<TemplateItem>) => {
    setTemplates((prev) => prev.map((t) => t.id === id ? { ...t, ...updates } : t));
  }, []);

  // Export current sheet
  const handleExportSheet = useCallback(() => {
    if (!currentSheet) return;

    const svg = generateSheetSvg({
      sheetIndex: currentSheet.sheetIndex,
      sheet: currentSheet,
      templates,
      settings,
    });

    const filename = generateSheetFilename(
      currentSheet.sheetIndex,
      layoutResult.sheets.length,
      currentSheet.items.length,
      settings,
      templates[0]?.name
    );

    downloadTextFile(filename, svg, 'image/svg+xml');
  }, [currentSheet, templates, settings, layoutResult.sheets.length, locale, t]);

  // Export ZIP
  const handleExportZip = useCallback(async () => {
    if (layoutResult.sheets.length === 0) return;

    setIsExporting(true);
    try {
      const blob = await generateZipExport({
        sheets: layoutResult.sheets,
        templates,
        settings,
      });

      const totalItems = layoutResult.sheets.reduce((sum, s) => sum + s.items.length, 0);
      const filename = generateZipFilename(totalItems, layoutResult.sheets.length, settings);

      downloadZip(blob, filename);
    } catch (error) {
      alert(error instanceof Error ? error.message : t('ornament_layout.ui.errors.failed_to_export_zip'));
    } finally {
      setIsExporting(false);
    }
  }, [layoutResult.sheets, templates, settings, t]);

  const totalQty = templates.reduce((sum, t) => sum + t.qty, 0);
  const totalItems = layoutResult.sheets.reduce((sum, s) => sum + s.items.length, 0);

  return (
    <div className="lfs-tool lfs-tool-ornament-layout-planner-v2">
      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[320px,1fr]">
        {/* Left Panel - Controls */}
        <div className="space-y-4">
          {/* Templates */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-medium text-slate-100">{t('ornament_layout.ui.templates')}</div>
              <div className="text-xs text-slate-400">{t('ornament_layout.ui.total_qty')}: {totalQty}</div>
            </div>

            <div className="mb-3">
              <div className="mb-2 text-xs text-slate-300">{t('ornament_layout.ui.built_in_templates')}</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {BUILT_IN_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.key}
                    type="button"
                    onClick={() => handleAddBuiltInTemplate(tpl.key)}
                    className={
                      activeBuiltInKey === tpl.key
                        ? 'group rounded-lg border border-sky-500 bg-slate-900/60 p-2 text-left'
                        : 'group rounded-lg border border-slate-800 bg-slate-900/30 p-2 text-left hover:border-slate-600'
                    }
                    title={t(tpl.name)}
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden rounded-md border border-slate-800 bg-white">
                      <div
                        className="h-full w-full [&_svg]:h-full [&_svg]:w-full [&_svg]:block"
                        dangerouslySetInnerHTML={{ __html: tpl.thumbnailSvg }}
                      />
                    </div>
                    <div className="mt-2 text-[11px] font-medium text-slate-100 leading-tight">{t(tpl.name)}</div>
                    <div className="text-[10px] text-slate-400">{t('ornament_layout.ui.click_to_add')}</div>
                  </button>
                ))}
              </div>
            </div>
            
            <input
              type="file"
              accept="image/svg+xml,.svg"
              onChange={(e) => e.target.files?.[0] && handleAddTemplate(e.target.files[0])}
              className="mb-3 block w-full text-sm text-slate-200 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-xs file:text-slate-200 hover:file:bg-slate-800"
            />

            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {templates.map((tpl) => (
                <div key={tpl.id} className="rounded-md border border-slate-800 bg-slate-900/50 p-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={tpl.name}
                      onChange={(e) => handleUpdateTemplate(tpl.id, { name: e.target.value })}
                      className="flex-1 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100"
                    />
                    <button
                      onClick={() => handleRemoveTemplate(tpl.id)}
                      className="rounded bg-red-900/30 px-2 py-1 text-xs text-red-400 hover:bg-red-900/50"
                    >
                      ×
                    </button>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                    <span>
                      {toDisplayLength(tpl.width, unitSystem).toFixed(unitSystem === 'in' ? 3 : 1)}×{toDisplayLength(tpl.height, unitSystem).toFixed(unitSystem === 'in' ? 3 : 1)}{unitSystem}
                    </span>
                    <input
                      type="number"
                      value={tpl.qty}
                      min={0}
                      onChange={(e) => handleUpdateTemplate(tpl.id, { qty: Number(e.target.value) })}
                      className="w-16 rounded border border-slate-700 bg-slate-950 px-1 py-0.5 text-[10px]"
                      placeholder={t('ornament_layout.ui.qty')}
                    />
                    <select
                      value={tpl.rotateDeg}
                      onChange={(e) => handleUpdateTemplate(tpl.id, { rotateDeg: Number(e.target.value) as 0 | 90 | 180 | 270 })}
                      className="rounded border border-slate-700 bg-slate-950 px-1 py-0.5 text-[10px]"
                    >
                      <option value={0}>0°</option>
                      <option value={90}>90°</option>
                      <option value={180}>180°</option>
                      <option value={270}>270°</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sheet Presets */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="text-sm font-medium text-slate-100 mb-3">{t('ornament_layout.ui.sheet_presets')}</div>
            <div className="flex flex-wrap gap-2">
              {SHEET_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => setSettings((s) => ({ ...s, sheetW: preset.widthMm, sheetH: preset.heightMm }))}
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
                  title={t(preset.description)}
                >
                  {t(preset.name)}
                </button>
              ))}
            </div>
            
            <div className="mt-3 grid grid-cols-3 gap-2">
              <label className="grid gap-1">
                <div className="text-[10px] text-slate-300">{t('ornament_layout.ui.width_mm')} ({unitSystem})</div>
                <input
                  type="number"
                  value={toDisplayLength(settings.sheetW, unitSystem)}
                  onChange={(e) => setSettings((s) => ({ ...s, sheetW: fromDisplayLength(Number(e.target.value), unitSystem) }))}
                  step={lenStep}
                  className="rounded border border-slate-800 bg-slate-950 px-1 py-1 text-xs w-full"
                />
              </label>
              <label className="grid gap-1">
                <div className="text-[10px] text-slate-300">{t('ornament_layout.ui.height_mm')} ({unitSystem})</div>
                <input
                  type="number"
                  value={toDisplayLength(settings.sheetH, unitSystem)}
                  onChange={(e) => setSettings((s) => ({ ...s, sheetH: fromDisplayLength(Number(e.target.value), unitSystem) }))}
                  step={lenStep}
                  className="rounded border border-slate-800 bg-slate-950 px-1 py-1 text-xs w-full"
                />
              </label>
              <label className="grid gap-1">
                <div className="text-[10px] text-slate-300">{t('ornament_layout.ui.margin_mm')} ({unitSystem})</div>
                <input
                  type="number"
                  value={toDisplayLength(settings.margin, unitSystem)}
                  onChange={(e) => setSettings((s) => ({ ...s, margin: fromDisplayLength(Number(e.target.value), unitSystem) }))}
                  step={lenStep}
                  className="rounded border border-slate-800 bg-slate-950 px-1 py-1 text-xs w-full"
                />
              </label>
            </div>
          </div>

          {/* Hole Customization */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="text-sm font-medium text-slate-100 mb-3">{t('ornament_layout.ui.hole_settings')}</div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-slate-300">{t('ornament_layout.ui.hole_size_mm')} ({unitSystem})</label>
                  <span className="text-xs text-slate-400">{toDisplayLength(settings.holeRadius, unitSystem).toFixed(unitSystem === 'in' ? 3 : 1)}</span>
                </div>
                <input
                  type="range"
                  min={toDisplayLength(1, unitSystem)}
                  max={toDisplayLength(5, unitSystem)}
                  step={unitSystem === 'in' ? 0.01 : 0.1}
                  value={toDisplayLength(settings.holeRadius, unitSystem)}
                  onChange={(e) => setSettings((s) => ({ ...s, holeRadius: fromDisplayLength(Number(e.target.value), unitSystem) }))}
                  className="w-full"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-slate-300">{t('ornament_layout.ui.hole_position_mm_from_top')} ({unitSystem})</label>
                  <span className="text-xs text-slate-400">{toDisplayLength(settings.holeYOffset, unitSystem).toFixed(unitSystem === 'in' ? 3 : 1)}</span>
                </div>
                <input
                  type="range"
                  min={toDisplayLength(5, unitSystem)}
                  max={toDisplayLength(25, unitSystem)}
                  step={unitSystem === 'in' ? 0.02 : 0.5}
                  value={toDisplayLength(settings.holeYOffset, unitSystem)}
                  onChange={(e) => setSettings((s) => ({ ...s, holeYOffset: fromDisplayLength(Number(e.target.value), unitSystem) }))}
                  className="w-full"
                />
              </div>
              <p className="text-xs text-slate-400">{t('ornament_layout.ui.applies_to_templates_with_holes')}</p>
            </div>
          </div>

          {/* Mode & Layout */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="text-sm font-medium text-slate-100 mb-3">{t('ornament_layout.ui.layout_mode')}</div>
            
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setSettings((s) => ({ ...s, mode: 'grid' }))}
                className={`flex-1 rounded-md px-3 py-2 text-xs font-medium ${
                  settings.mode === 'grid'
                    ? 'bg-sky-500 text-white'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {t('ornament_layout.ui.mode.grid')}
              </button>
              <button
                onClick={() => setSettings((s) => ({ ...s, mode: 'pack' }))}
                className={`flex-1 rounded-md px-3 py-2 text-xs font-medium ${
                  settings.mode === 'pack'
                    ? 'bg-sky-500 text-white'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {t('ornament_layout.ui.mode.pack')}
              </button>
            </div>

            {settings.mode === 'grid' ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <label className="grid gap-1">
                    <div className="text-[10px] text-slate-300">{t('ornament_layout.ui.rows')}</div>
                    <input
                      type="number"
                      value={settings.rows}
                      min={1}
                      onChange={(e) => setSettings((s) => ({ ...s, rows: Number(e.target.value) }))}
                      className="rounded border border-slate-800 bg-slate-950 px-2 py-1 text-xs"
                    />
                  </label>
                  <label className="grid gap-1">
                    <div className="text-[10px] text-slate-300">{t('ornament_layout.ui.columns')}</div>
                    <input
                      type="number"
                      value={settings.cols}
                      min={1}
                      onChange={(e) => setSettings((s) => ({ ...s, cols: Number(e.target.value) }))}
                      className="rounded border border-slate-800 bg-slate-950 px-2 py-1 text-xs"
                    />
                  </label>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-200">
                  <input
                    type="checkbox"
                    checked={settings.autoFit}
                    onChange={(e) => setSettings((s) => ({ ...s, autoFit: e.target.checked }))}
                  />
                  {t('ornament_layout.ui.auto_fit')}
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-200">
                  <input
                    type="checkbox"
                    checked={settings.center}
                    onChange={(e) => setSettings((s) => ({ ...s, center: e.target.checked }))}
                  />
                  {t('ornament_layout.ui.center_layout')}
                </label>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-slate-200">
                  <input
                    type="checkbox"
                    checked={settings.groupByTemplate}
                    onChange={(e) => setSettings((s) => ({ ...s, groupByTemplate: e.target.checked }))}
                  />
                  {t('ornament_layout.ui.group_by_template')}
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-200">
                  <input
                    type="checkbox"
                    checked={settings.allowRotateInPack}
                    onChange={(e) => setSettings((s) => ({ ...s, allowRotateInPack: e.target.checked }))}
                  />
                  {t('ornament_layout.ui.allow_auto_rotate')}
                </label>
              </div>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="grid gap-1">
                <div className="text-[10px] text-slate-300">{t('ornament_layout.ui.gap_x_mm')} ({unitSystem})</div>
                <input
                  type="number"
                  value={toDisplayLength(settings.gapX, unitSystem)}
                  onChange={(e) => setSettings((s) => ({ ...s, gapX: fromDisplayLength(Number(e.target.value), unitSystem) }))}
                  step={lenStep}
                  className="rounded border border-slate-800 bg-slate-950 px-2 py-1 text-xs"
                />
              </label>
              <label className="grid gap-1">
                <div className="text-[10px] text-slate-300">{t('ornament_layout.ui.gap_y_mm')} ({unitSystem})</div>
                <input
                  type="number"
                  value={toDisplayLength(settings.gapY, unitSystem)}
                  onChange={(e) => setSettings((s) => ({ ...s, gapY: fromDisplayLength(Number(e.target.value), unitSystem) }))}
                  step={lenStep}
                  className="rounded border border-slate-800 bg-slate-950 px-2 py-1 text-xs"
                />
              </label>
            </div>
          </div>

          
          {/* Export */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="text-sm font-medium text-slate-100 mb-3">{t('ornament_layout.ui.export')}</div>
            <div className="space-y-2">
              <button
                onClick={handleExportSheet}
                disabled={!currentSheet}
                className="w-full rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50"
              >
                {t('ornament_layout.ui.export_current_sheet_svg')}
              </button>
              {layoutResult.sheets.length > 1 && (
                <button
                  onClick={handleExportZip}
                  disabled={isExporting}
                  className="w-full rounded-md bg-purple-500 px-4 py-2 text-sm font-medium text-white hover:bg-purple-600 disabled:opacity-50"
                >
                  {isExporting ? t('ornament_layout.ui.exporting') : t('ornament_layout.ui.export_all_sheets_zip')}
                </button>
              )}
              <button
                onClick={async () => {
                  if (!currentSheet) return;
                  try {
                    const svg = generateSheetSvg({ sheet: currentSheet, templates, settings, sheetIndex: currentSheetIndex });
                    const artifact = await createArtifact({
                      toolSlug: 'ornament-layout-planner',
                      name: `ornament-layout-${Date.now()}`,
                      svg,
                      meta: {
                        bboxMm: { width: settings.sheetW, height: settings.sheetH },
                        operations: { hasCuts: true },
                        notes: `${currentSheet.items.length} ${t('ornament_layout.ui.items_on_sheet')}`,
                      },
                    });
                    addToPriceCalculator(artifact);
                  } catch (e) {
                    console.error(t('ornament_layout.ui.errors.failed_to_add_to_price_calculator'), e);
                  }
                }}
                disabled={!currentSheet}
                className="w-full rounded-md border-2 border-emerald-500 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50"
              >
                💰 {t('ornament_layout.ui.add_to_price_calculator')}
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Preview */}
        <div className="space-y-4">
          {/* Summary */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="text-xs space-y-1">
              <div className="text-slate-100">
                <span className="font-medium">{t('ornament_layout.ui.total_items')}:</span> {totalItems} / {totalQty}
              </div>
              <div className="text-slate-100">
                <span className="font-medium">{t('ornament_layout.ui.sheets')}:</span> {layoutResult.sheets.length}
              </div>
              <div className="text-slate-100">
                <span className="font-medium">{t('ornament_layout.ui.mode')}:</span> {settings.mode}
              </div>
            </div>

            {layoutResult.summaryWarnings.length > 0 && (
              <div className="mt-2 space-y-1">
                {layoutResult.summaryWarnings.map((w, i) => (
                  <div key={i} className="text-[10px] text-amber-400">⚠ {w}</div>
                ))}
              </div>
            )}

            {layoutResult.errors.length > 0 && (
              <div className="mt-2 space-y-1">
                {layoutResult.errors.map((e, i) => (
                  <div key={i} className="text-[10px] text-red-400">✕ {e}</div>
                ))}
              </div>
            )}
          </div>

          {/* Sheet Tabs */}
          {layoutResult.sheets.length > 1 && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
              <div className="flex gap-1 overflow-x-auto">
                {layoutResult.sheets.map((sheet) => (
                  <button
                    key={sheet.sheetIndex}
                    onClick={() => setCurrentSheetIndex(sheet.sheetIndex)}
                    className={`rounded px-3 py-1 text-xs whitespace-nowrap ${
                      currentSheetIndex === sheet.sheetIndex
                        ? 'bg-sky-500 text-white'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {t('ornament_layout.ui.sheet')} {sheet.sheetIndex} ({sheet.items.length})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 sticky top-4">
            <div className="mb-2 text-xs text-slate-300">{t('ornament_layout.ui.preview')}</div>
            <div className="relative overflow-auto rounded-lg border border-slate-800 bg-white p-3 max-h-[calc(100vh-8rem)]">
              <div dangerouslySetInnerHTML={{ __html: previewSvg }} />

              {templates.length === 0 && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="rounded-md bg-slate-950/70 px-3 py-2 text-xs text-slate-100 shadow">
                    {t('ornament_layout.ui.preview_overlay_select_template')}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

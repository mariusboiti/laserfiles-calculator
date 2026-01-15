'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { BoxType, type HingedBoxSvgs, type HingedInputs } from '../../core/types';
import {
  generateHingedBoxPanels,
} from '../../core/hinged/generateHingedBoxSvgs';
import { generateHingedBoxSvgsFromPanelsWithMode } from '../../core/hinged/generateHingedBoxSvgs';
import type { PathOperation } from '../../../src/lib/types';
import { importSvgAsFace } from '../../../src/lib/svgImport';
import { mergeSvgWithOverlays, type EngraveOverlayItem } from '../../core/shared/mergeSvgWithOverlays';
import { exportSingleSvg } from '../../export/exportSvgs';
import { AIWarningBanner } from '@/components/ai';
import { useLanguage } from '@/app/(app)/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';

type FaceArtworkPlacement = {
  x: number;
  y: number;
  scale: number;
  rotationDeg: number;
};

type FaceArtworkConfig = {
  prompt: string;
  imageDataUrl: string;
  placement: FaceArtworkPlacement;
};

import { HingedPanelPreview } from './HingedPanelPreview';
import { HingedBoxPreview3D } from './HingedBoxPreview3D';
import { validateHingedInputs, calculateRecommendedFingerWidth } from '../../core/validation';
import { generateExportFilename } from '../../core/exportNaming';
import { GOLDEN_PRESETS, adjustPresetForHinged } from '../../core/presets';
import { checkHingedBoxSvgs } from '../../core/regressionChecks';
import { HINGED_PRESETS, DEFAULTS } from '../../config/defaults';
import { validateBoxInputs } from '../../core/shared/validate';
import { exportHingedBoxZip } from '../../export/exportZip';

function clampNumber(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

interface HingedBoxUIProps {
  boxTypeSelector?: ReactNode;
  unitSystem: 'mm' | 'in';
  onResetCallback?: (callback: () => void) => void;
}

export function HingedBoxUI({ boxTypeSelector, unitSystem, onResetCallback }: HingedBoxUIProps) {
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  const MM_PER_INCH = 25.4;
  const unitLabel = unitSystem;
  const toUser = (mm: number) => (unitSystem === 'in' ? mm / MM_PER_INCH : mm);
  const fromUser = (val: number) => (unitSystem === 'in' ? val * MM_PER_INCH : val);

  const [widthMm, setWidthMm] = useState(156);
  const [depthMm, setDepthMm] = useState(156);
  const [heightMm, setHeightMm] = useState(150);
  const [thicknessMm, setThicknessMm] = useState(3);
  const [kerfMm, setKerfMm] = useState(0.15);

  const [previewMode, setPreviewMode] = useState<'2d' | 'faces' | '3d'>('2d');

  const [hingeFingerWidthMm, setHingeFingerWidthMm] = useState(8);
  const [hingeClearanceMm, setHingeClearanceMm] = useState(0.2);
  const [hingeHoleDiameterMm, setHingeHoleDiameterMm] = useState(5);
  const [hingeHoleInsetMm, setHingeHoleInsetMm] = useState(8);
  const [autoFingerCount, setAutoFingerCount] = useState(true);
  const [manualHingeFingerCount, setManualHingeFingerCount] = useState(11);

  const [jointFingerWidthMm, setJointFingerWidthMm] = useState(15);
  const [autoJointFingerCount, setAutoJointFingerCount] = useState(true);
  const [manualJointFingerCount, setManualJointFingerCount] = useState(11);

  const [engraveOp, setEngraveOp] = useState<PathOperation>('engrave');
  const [engraveTarget, setEngraveTarget] = useState<keyof HingedBoxSvgs>('front');
  const [engraveItems, setEngraveItems] = useState<EngraveOverlayItem[]>([]);
  const [selectedEngraveId, setSelectedEngraveId] = useState<string | null>(null);

  const [faceArtworkByFace, setFaceArtworkByFace] = useState<Record<string, FaceArtworkConfig | undefined>>({});
  const [faceArtworkTargets, setFaceArtworkTargets] = useState<string[]>(['front']);
  const [faceArtworkPrompt, setFaceArtworkPrompt] = useState<string>('');
  const [selectedArtworkFace, setSelectedArtworkFace] = useState<string>('front');
  const [isArtworkGenerating, setIsArtworkGenerating] = useState(false);
  const [artworkError, setArtworkError] = useState<string | null>(null);

  const { input, panels, svgs, validation } = useMemo(() => {
    const input: HingedInputs = {
      widthMm: clampNumber(widthMm, 10, 5000),
      depthMm: clampNumber(depthMm, 10, 5000),
      heightMm: clampNumber(heightMm, 10, 5000),
      thicknessMm: clampNumber(thicknessMm, 1, 50),
      kerfMm: clampNumber(kerfMm, 0, 1),

      hingeFingerWidthMm: clampNumber(hingeFingerWidthMm, 2, 200),
      hingeClearanceMm: clampNumber(hingeClearanceMm, 0, 2),
      hingeHoleDiameterMm: clampNumber(thicknessMm + 2, 0, 50),
      hingeHoleInsetMm: clampNumber(hingeHoleInsetMm, 0, 200),
      jointFingerWidthMm: clampNumber(jointFingerWidthMm, 2, 200),
      autoJointFingerCount,
      manualJointFingerCount: autoJointFingerCount ? undefined : clampNumber(manualJointFingerCount, 3, 999),
      autoFingerCount,
      manualHingeFingerCount: autoFingerCount ? undefined : clampNumber(manualHingeFingerCount, 3, 999),
    };

    const validation = validateHingedInputs(input);
    const panels = generateHingedBoxPanels(input);

    const out: HingedBoxSvgs = generateHingedBoxSvgsFromPanelsWithMode(panels, 'parametric', input);

    const svgs = (Object.keys(out) as (keyof HingedBoxSvgs)[]).reduce((acc, k) => {
      const items = engraveItems.filter((it) => it.placement && it.fileName && it.id.startsWith(`${k}:`));
      acc[k] = mergeSvgWithOverlays(out[k], items);
      return acc;
    }, {} as HingedBoxSvgs);

    return { input, panels, svgs, validation };
  }, [
    widthMm,
    depthMm,
    heightMm,
    thicknessMm,
    kerfMm,
    hingeFingerWidthMm,
    hingeClearanceMm,
    hingeHoleInsetMm,
    autoFingerCount,
    manualHingeFingerCount,
    jointFingerWidthMm,
    autoJointFingerCount,
    manualJointFingerCount,
    engraveItems,
  ]);

  const selectedEngraveItem = selectedEngraveId ? engraveItems.find((x) => x.id === selectedEngraveId) ?? null : null;

  const setSelectedEngravePlacement = (patch: Partial<EngraveOverlayItem['placement']>) => {
    if (!selectedEngraveId) return;
    setEngraveItems((prev) =>
      prev.map((it) => (it.id === selectedEngraveId ? { ...it, placement: { ...it.placement, ...patch } } : it)),
    );
  };

  const setSelectedArtworkPlacement = (patch: Partial<FaceArtworkPlacement>) => {
    if (!selectedArtworkFace) return;
    setFaceArtworkByFace((prev) => {
      const cur = prev[selectedArtworkFace];
      if (!cur) return prev;
      return {
        ...prev,
        [selectedArtworkFace]: {
          ...cur,
          placement: {
            ...cur.placement,
            ...patch,
          },
        },
      };
    });
  };

  const toggleArtworkTarget = (face: string) => {
    setFaceArtworkTargets((prev) => {
      const has = prev.includes(face);
      const next = has ? prev.filter((x) => x !== face) : [...prev, face];
      return next.length ? next : prev;
    });
  };

  const handleGenerateArtwork = async () => {
    const prompt = faceArtworkPrompt.trim();
    if (!prompt) {
      setArtworkError(t('boxmaker.artwork_error.prompt_required'));
      return;
    }

    const faceKeys = ['front', 'back', 'left', 'right', 'bottom', 'lid'];
    const targets = faceArtworkTargets.filter((t) => faceKeys.includes(t));
    if (targets.length === 0) {
      setArtworkError(t('boxmaker.artwork_error.select_face'));
      return;
    }

    setIsArtworkGenerating(true);
    setArtworkError(null);

    try {
      const enhancedPrompt = `${prompt}, white background`;
      const res = await fetch('/api/ai/silhouette', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: enhancedPrompt }),
      });

      if (!res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const errJson: any = await res.json().catch(() => ({}));
          throw new Error(errJson?.error || t('boxmaker.artwork_error.ai_generation_failed'));
        }
        const text = await res.text().catch(() => '');
        throw new Error(text || t('boxmaker.artwork_error.ai_generation_failed'));
      }

      const json: any = await res.json().catch(() => ({}));
      const dataUrl = typeof json?.dataUrl === 'string' ? json.dataUrl : '';
      if (!dataUrl) {
        throw new Error(t('boxmaker.artwork_error.ai_no_data_url'));
      }

      setFaceArtworkByFace((prev) => {
        const next = { ...prev };
        for (const faceName of targets) {
          const targetW =
            faceName === 'front' || faceName === 'back' || faceName === 'lid'
              ? input.widthMm
              : faceName === 'left' || faceName === 'right'
                ? input.depthMm
                : input.widthMm;
          const targetH =
            faceName === 'bottom'
              ? input.depthMm
              : faceName === 'lid'
                ? Math.max(1, input.depthMm - input.thicknessMm)
                : input.heightMm;

          const existing = next[faceName];
          next[faceName] = {
            prompt,
            imageDataUrl: dataUrl,
            placement: existing?.placement ?? { x: targetW / 2, y: targetH / 2, scale: 0.5, rotationDeg: 0 },
          };
        }
        return next;
      });

      if (!targets.includes(selectedArtworkFace)) {
        setSelectedArtworkFace(targets[0]);
      }
    } catch (e) {
      setArtworkError(e instanceof Error ? e.message : t('boxmaker.artwork_error.ai_generation_failed'));
    } finally {
      setIsArtworkGenerating(false);
    }
  };

  const handleTraceSelectedArtwork = async () => {
    const faceName = String(selectedArtworkFace || '').trim();
    const art = faceName ? faceArtworkByFace[faceName] : null;
    if (!faceName || !art?.imageDataUrl) {
      setArtworkError(t('boxmaker.trace_error.select_face_with_artwork'));
      return;
    }

    const targetW =
      faceName === 'front' || faceName === 'back' || faceName === 'lid'
        ? input.widthMm
        : faceName === 'left' || faceName === 'right'
          ? input.depthMm
          : input.widthMm;
    const targetH =
      faceName === 'bottom'
        ? input.depthMm
        : faceName === 'lid'
          ? Math.max(1, input.depthMm - input.thicknessMm)
          : input.heightMm;

    setIsArtworkGenerating(true);
    setArtworkError(null);

    try {
      const res = await fetch('/api/trace/potrace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataUrl: art.imageDataUrl,
          mode: 'CUT_SILHOUETTE',
          targetWidthMm: targetW,
          targetHeightMm: targetH,
        }),
      });

      const json: any = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        throw new Error((typeof json?.error === 'string' && json.error) || t('boxmaker.trace_error.trace_failed'));
      }

      const paths: string[] = Array.isArray(json?.paths) ? json.paths.filter((p: any) => typeof p === 'string') : [];
      if (!paths.length) {
        throw new Error(t('boxmaker.trace_error.no_paths'));
      }

      const svgText = `<svg xmlns="http://www.w3.org/2000/svg">${paths
        .map((d) => `<path d="${d}" />`)
        .join('')}</svg>`;

      const op: PathOperation = 'cut';
      const face = importSvgAsFace({
        svgText,
        id: `trace-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        op,
        label: `trace-${faceName}`,
      });

      if (!face) {
        throw new Error(t('boxmaker.trace_error.import_failed'));
      }

      const id = `${faceName}:${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setEngraveItems((prev) => [
        ...prev,
        {
          id,
          fileName: `trace-${faceName}.svg`,
          op: 'cut',
          face,
          placement: {
            x: art.placement.x,
            y: art.placement.y,
            rotation: ((art.placement.rotationDeg ?? 0) * Math.PI) / 180,
            scale: Math.max(0.01, art.placement.scale ?? 1),
          },
        },
      ]);
      setSelectedEngraveId(id);
      setEngraveTarget(faceName as keyof HingedBoxSvgs);
    } catch (e) {
      setArtworkError(e instanceof Error ? e.message : t('boxmaker.trace_error.trace_failed'));
    } finally {
      setIsArtworkGenerating(false);
    }
  };

  function exportAllPanels() {
    (Object.keys(svgs) as (keyof HingedBoxSvgs)[]).forEach((k) => {
      const filename = generateExportFilename(BoxType.hinged, k);
      exportSingleSvg(filename, svgs[k]);
    });
  }

  async function exportAllZip() {
    await exportHingedBoxZip(
      svgs,
      input.widthMm,
      input.depthMm,
      input.heightMm,
      input.thicknessMm,
      input.kerfMm
    );
  }

  const recommendedFinger = useMemo(
    () => calculateRecommendedFingerWidth(widthMm, depthMm, heightMm),
    [widthMm, depthMm, heightMm]
  );

  function applyPreset(presetName: string) {
    const preset = GOLDEN_PRESETS.find((p) => p.name === presetName);
    if (!preset) return;
    
    const adjusted = adjustPresetForHinged(preset);
    setWidthMm(adjusted.widthMm);
    setDepthMm(adjusted.depthMm);
    setHeightMm(adjusted.heightMm);
    setThicknessMm(adjusted.thicknessMm);
    setKerfMm(adjusted.kerfMm);
    setJointFingerWidthMm(adjusted.jointFingerWidthMm);
    setHingeFingerWidthMm(adjusted.hingeFingerWidthMm);
    setHingeClearanceMm(adjusted.hingeClearanceMm);
    setHingeHoleInsetMm(adjusted.hingeHoleInsetMm);
  }

  const regressionCheck = useMemo(() => {
    return checkHingedBoxSvgs(svgs, panels);
  }, [svgs, panels]);

  const boxWarnings = useMemo(() => {
    return validateBoxInputs({
      widthMm: input.widthMm,
      depthMm: input.depthMm,
      heightMm: input.heightMm,
      thicknessMm: input.thicknessMm,
      kerfMm: input.kerfMm,
      fingerWidthMm: input.jointFingerWidthMm,
    });
  }, [input]);

  function applyBoxPreset(presetName: string) {
    const preset = HINGED_PRESETS.find((p) => p.name === presetName);
    if (!preset) return;
    
    setWidthMm(preset.widthMm);
    setDepthMm(preset.depthMm);
    setHeightMm(preset.heightMm);
    setThicknessMm(preset.thicknessMm);
  }

  function resetToDefaults() {
    setWidthMm(DEFAULTS.hinged.widthMm);
    setDepthMm(DEFAULTS.hinged.depthMm);
    setHeightMm(DEFAULTS.hinged.heightMm);
    setThicknessMm(DEFAULTS.common.thicknessMm);
    setKerfMm(DEFAULTS.common.kerfMm);
    setJointFingerWidthMm(DEFAULTS.hinged.jointFingerWidthMm);
    setHingeFingerWidthMm(DEFAULTS.hinged.hingeFingerWidthMm);
    setHingeClearanceMm(DEFAULTS.hinged.hingeClearanceMm);
    setHingeHoleInsetMm(DEFAULTS.hinged.hingeHoleInsetMm);
    setAutoFingerCount(DEFAULTS.hinged.autoFingerCount);
    setEngraveItems([]);
    setSelectedEngraveId(null);
    setEngraveTarget('front');
    setFaceArtworkTargets(['front']);
    setFaceArtworkPrompt('');
    setFaceArtworkByFace({});
    setSelectedArtworkFace('front');
    setIsArtworkGenerating(false);
    setArtworkError(null);
  }

  // Register reset callback with parent
  useEffect(() => {
    if (onResetCallback) {
      onResetCallback(resetToDefaults);
    }
  }, [onResetCallback]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <header className="border-b border-slate-900 bg-slate-950/80">
        <div className="mx-auto flex w-full items-center justify-between gap-4 px-4 py-3">
          <div>
            <h1 className="text-sm font-semibold text-slate-100 md:text-base">{t('boxmaker.header_title')}</h1>
            <p className="text-[11px] text-slate-400">{t('boxmaker.hinged_subtitle')}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full flex-1 flex-col gap-4 px-4 py-4 md:flex-row">
        <section className="w-full md:w-80 lg:w-96">
          <div className="max-h-[calc(100vh-96px)] overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/40 p-3 md:p-4">
            <div className="space-y-4">
              {boxTypeSelector ? (
                <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">{boxTypeSelector}</div>
              ) : null}

              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">{t('boxmaker.presets')}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {HINGED_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => applyBoxPreset(preset.name)}
                      className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
                      title={t(`boxmaker.preset_desc.hinged_${preset.name.toLowerCase()}`)}
                    >
                      {t(`boxmaker.preset_${preset.name.toLowerCase()}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">{t('boxmaker.engrave_svg')}</div>
                <div className="mt-3 grid gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="file"
                      accept="image/svg+xml,.svg"
                      className="block w-[220px] text-[11px] text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-[11px] file:text-slate-200 hover:file:bg-slate-700"
                      onChange={async (e) => {
                        const inputEl = e.currentTarget as HTMLInputElement | null;
                        const f = inputEl?.files?.[0];
                        if (!f) return;
                        const text = await f.text();
                        const face = importSvgAsFace({
                          svgText: text,
                          id: `import-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                          op: engraveOp,
                          label: f.name,
                        });
                        if (!face) {
                          if (inputEl) inputEl.value = '';
                          return;
                        }

                        const targetW =
                          engraveTarget === 'front' || engraveTarget === 'back' || engraveTarget === 'lid'
                            ? input.widthMm
                            : engraveTarget === 'left' || engraveTarget === 'right'
                              ? input.depthMm
                              : input.widthMm;
                        const targetH =
                          engraveTarget === 'bottom'
                            ? input.depthMm
                            : engraveTarget === 'lid'
                              ? Math.max(1, input.depthMm - input.thicknessMm)
                              : input.heightMm;

                        const id = `${engraveTarget}:${Date.now()}-${Math.random().toString(16).slice(2)}`;
                        setEngraveItems((prev) => [
                          ...prev,
                          {
                            id,
                            fileName: f.name,
                            op: engraveOp,
                            face,
                            placement: { x: targetW / 2, y: targetH / 2, rotation: 0, scale: 1 },
                          },
                        ]);
                        setSelectedEngraveId(id);
                        if (inputEl) inputEl.value = '';
                      }}
                    />

                    <select
                      value={engraveOp}
                      onChange={(e) => setEngraveOp(e.target.value as PathOperation)}
                      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                      title={t('boxmaker.operation')}
                    >
                      <option value="engrave">{t('boxmaker.op_engrave')}</option>
                      <option value="score">{t('boxmaker.op_score')}</option>
                    </select>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <label className="grid gap-1">
                      <div className="text-[11px] text-slate-400">{t('boxmaker.target_panel')}</div>
                      <select
                        value={engraveTarget}
                        onChange={(e) => setEngraveTarget(e.target.value as keyof HingedBoxSvgs)}
                        className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                      >
                        <option value="front">front</option>
                        <option value="back">back</option>
                        <option value="left">left</option>
                        <option value="right">right</option>
                        <option value="bottom">bottom</option>
                        <option value="lid">lid</option>
                      </select>
                    </label>
                  </div>

                  {engraveItems.length > 0 ? (
                    <div className="mt-1 space-y-1">
                      {engraveItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedEngraveId(item.id)}
                          className={
                            selectedEngraveId === item.id
                              ? 'w-full rounded-md border border-sky-500 bg-slate-900 px-2 py-1 text-left text-[11px] text-slate-100'
                              : 'w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-left text-[11px] text-slate-300 hover:border-slate-600'
                          }
                        >
                          {item.fileName}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">Face Artwork</div>
                <div className="mt-1 text-[11px] text-slate-400">Preview-only overlay (not included in exports)</div>

                <div className="mt-3">
                  <AIWarningBanner />
                </div>

                <div className="mt-3 grid gap-2">
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">Prompt</div>
                    <input
                      type="text"
                      value={faceArtworkPrompt}
                      onChange={(e) => setFaceArtworkPrompt(e.target.value)}
                      placeholder="e.g. floral silhouette"
                      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                    />
                  </label>

                  <div className="grid gap-1">
                    <div className="text-[11px] text-slate-400">Faces</div>
                    <div className="flex flex-wrap gap-2">
                      {['front', 'back', 'left', 'right', 'bottom', 'lid'].map((k) => (
                        <label key={k} className="flex items-center gap-1 text-[11px] text-slate-200">
                          <input
                            type="checkbox"
                            checked={faceArtworkTargets.includes(k)}
                            onChange={() => toggleArtworkTarget(k)}
                          />
                          <span className="uppercase">{k}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleGenerateArtwork}
                      disabled={isArtworkGenerating}
                      className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-60"
                    >
                      {isArtworkGenerating ? 'Generating…' : 'Generate'}
                    </button>
                    <button
                      type="button"
                      onClick={handleTraceSelectedArtwork}
                      disabled={isArtworkGenerating}
                      className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-60"
                    >
                      Trace → SVG
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFaceArtworkByFace({});
                        setArtworkError(null);
                      }}
                      className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
                    >
                      Clear
                    </button>
                  </div>

                  {artworkError ? (
                    <div className="rounded-md border border-amber-800 bg-amber-950/30 p-2 text-[11px] text-amber-200">
                      {artworkError}
                    </div>
                  ) : null}

                  <div className="grid grid-cols-2 gap-2">
                    <label className="grid gap-1">
                      <div className="text-[11px] text-slate-400">Edit face</div>
                      <select
                        value={selectedArtworkFace}
                        onChange={(e) => setSelectedArtworkFace(e.target.value)}
                        className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                      >
                        {['front', 'back', 'left', 'right', 'bottom', 'lid'].map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="text-[11px] text-slate-500 self-end">Center-based X/Y in mm</div>
                  </div>

                  {faceArtworkByFace[selectedArtworkFace] ? (
                    <div className="grid grid-cols-2 gap-2">
                      <label className="grid gap-1">
                        <div className="text-[11px] text-slate-400">X (mm)</div>
                        <input
                          type="number"
                          value={Number(faceArtworkByFace[selectedArtworkFace]?.placement.x.toFixed(2))}
                          onChange={(e) => setSelectedArtworkPlacement({ x: Number(e.target.value) || 0 })}
                          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                        />
                      </label>
                      <label className="grid gap-1">
                        <div className="text-[11px] text-slate-400">Y (mm)</div>
                        <input
                          type="number"
                          value={Number(faceArtworkByFace[selectedArtworkFace]?.placement.y.toFixed(2))}
                          onChange={(e) => setSelectedArtworkPlacement({ y: Number(e.target.value) || 0 })}
                          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                        />
                      </label>
                      <label className="grid gap-1">
                        <div className="text-[11px] text-slate-400">Scale</div>
                        <input
                          type="number"
                          min={0.05}
                          step={0.05}
                          value={Number(faceArtworkByFace[selectedArtworkFace]?.placement.scale.toFixed(2))}
                          onChange={(e) =>
                            setSelectedArtworkPlacement({ scale: Math.max(0.05, Number(e.target.value) || 0.05) })
                          }
                          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                        />
                      </label>
                      <label className="grid gap-1">
                        <div className="text-[11px] text-slate-400">Rotate (deg)</div>
                        <input
                          type="number"
                          step={1}
                          value={Number(faceArtworkByFace[selectedArtworkFace]?.placement.rotationDeg.toFixed(0))}
                          onChange={(e) => setSelectedArtworkPlacement({ rotationDeg: Number(e.target.value) || 0 })}
                          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500">No artwork on this face yet.</div>
                  )}
                </div>
              </div>

              {selectedEngraveItem ? (
                <div className="mt-2 rounded-md border border-slate-800 bg-slate-950/40 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] text-slate-400">Placement</div>
                    <button
                      type="button"
                      onClick={() => {
                        setEngraveItems((prev) => prev.filter((x) => x.id !== selectedEngraveItem.id));
                        setSelectedEngraveId(null);
                      }}
                      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:border-rose-500 hover:text-rose-200"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                      <span>X ({unitLabel})</span>
                      <input
                        type="number"
                        step={unitSystem === 'in' ? 0.01 : 0.1}
                        value={toUser(selectedEngraveItem.placement.x)}
                        onChange={(e) => setSelectedEngravePlacement({ x: fromUser(Number(e.target.value)) })}
                        className="w-24 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                      <span>Y ({unitLabel})</span>
                      <input
                        type="number"
                        step={unitSystem === 'in' ? 0.01 : 0.1}
                        value={toUser(selectedEngraveItem.placement.y)}
                        onChange={(e) => setSelectedEngravePlacement({ y: fromUser(Number(e.target.value)) })}
                        className="w-24 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                      <span>Rotation (deg)</span>
                      <input
                        type="number"
                        step={1}
                        value={(selectedEngraveItem.placement.rotation * 180) / Math.PI}
                        onChange={(e) => {
                          const deg = Number(e.target.value);
                          const rad = (deg * Math.PI) / 180;
                          setSelectedEngravePlacement({ rotation: rad });
                        }}
                        className="w-24 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                      <span>Scale</span>
                      <input
                        type="number"
                        step={0.01}
                        min={0.01}
                        value={selectedEngraveItem.placement.scale}
                        onChange={(e) => setSelectedEngravePlacement({ scale: Math.max(0.01, Number(e.target.value)) })}
                        className="w-24 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                      />
                    </label>
                  </div>
                </div>
              ) : null}

              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">Dimensions</div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="grid gap-1">
                    <div className="text-xs text-slate-300">Width ({unitLabel})</div>
                    <input
                      className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                      type="number"
                      step={unitSystem === 'in' ? 0.01 : 0.1}
                      value={toUser(widthMm)}
                      onChange={(e) => setWidthMm(fromUser(Number(e.target.value)))}
                    />
                  </label>
                  <label className="grid gap-1">
                    <div className="text-xs text-slate-300">Depth ({unitLabel})</div>
                    <input
                      className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                      type="number"
                      step={unitSystem === 'in' ? 0.01 : 0.1}
                      value={toUser(depthMm)}
                      onChange={(e) => setDepthMm(fromUser(Number(e.target.value)))}
                    />
                  </label>
                  <label className="grid gap-1">
                    <div className="text-xs text-slate-300">Height ({unitLabel})</div>
                    <input
                      className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                      type="number"
                      step={unitSystem === 'in' ? 0.01 : 0.1}
                      value={toUser(heightMm)}
                      onChange={(e) => setHeightMm(fromUser(Number(e.target.value)))}
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">Material</div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="grid gap-1">
                    <div className="text-xs text-slate-300">Thickness ({unitLabel})</div>
                    <input
                      className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                      type="number"
                      step={unitSystem === 'in' ? 0.01 : 0.1}
                      value={toUser(thicknessMm)}
                      onChange={(e) => setThicknessMm(fromUser(Number(e.target.value)))}
                    />
                  </label>
                  <label className="grid gap-1">
                    <div className="text-xs text-slate-300">Kerf ({unitLabel})</div>
                    <input
                      className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                      type="number"
                      step={unitSystem === 'in' ? 0.001 : 0.01}
                      value={toUser(kerfMm)}
                      onChange={(e) => setKerfMm(fromUser(Number(e.target.value)))}
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">Hinge</div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="grid gap-1">
                    <div className="text-xs text-slate-300">Finger width ({unitLabel})</div>
                    <input
                      className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                      type="number"
                      step={unitSystem === 'in' ? 0.01 : 0.1}
                      value={toUser(hingeFingerWidthMm)}
                      onChange={(e) => setHingeFingerWidthMm(fromUser(Number(e.target.value)))}
                    />
                  </label>
                  <label className="grid gap-1">
                    <div className="text-xs text-slate-300">Clearance ({unitLabel})</div>
                    <input
                      className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                      type="number"
                      step={unitSystem === 'in' ? 0.001 : 0.01}
                      value={toUser(hingeClearanceMm)}
                      onChange={(e) => setHingeClearanceMm(fromUser(Number(e.target.value)))}
                    />
                  </label>
                  <label className="grid gap-1">
                    <div className="text-xs text-slate-300">Hole diameter ({unitLabel})</div>
                    <input
                      className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                      type="number"
                      step={unitSystem === 'in' ? 0.01 : 0.1}
                      value={toUser(clampNumber(thicknessMm + 2, 0, 50))}
                      disabled
                    />
                  </label>
                  <label className="grid gap-1">
                    <div className="text-xs text-slate-300">Hole inset ({unitLabel})</div>
                    <input
                      className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                      type="number"
                      step={unitSystem === 'in' ? 0.01 : 0.1}
                      value={toUser(hingeHoleInsetMm)}
                      onChange={(e) => setHingeHoleInsetMm(fromUser(Number(e.target.value)))}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-200">
                    <input type="checkbox" checked={autoFingerCount} onChange={(e) => setAutoFingerCount(e.target.checked)} />
                    Auto hinge finger count
                  </label>
                  {!autoFingerCount ? (
                    <label className="grid gap-1">
                      <div className="text-xs text-slate-300">Manual hinge count</div>
                      <input
                        className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                        type="number"
                        value={manualHingeFingerCount}
                        onChange={(e) => setManualHingeFingerCount(Number(e.target.value))}
                      />
                    </label>
                  ) : null}
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">Finger Joints</div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="grid gap-1">
                    <div className="text-xs text-slate-300">Finger width ({unitLabel})</div>
                    <input
                      className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                      type="number"
                      step={unitSystem === 'in' ? 0.01 : 0.1}
                      value={toUser(jointFingerWidthMm)}
                      onChange={(e) => setJointFingerWidthMm(fromUser(Number(e.target.value)))}
                    />
                  </label>

                  <label className="flex items-center gap-2 text-sm text-slate-200">
                    <input type="checkbox" checked={autoJointFingerCount} onChange={(e) => setAutoJointFingerCount(e.target.checked)} />
                    Auto joint finger count
                  </label>

                  {!autoJointFingerCount ? (
                    <label className="grid gap-1">
                      <div className="text-xs text-slate-300">Manual joint count</div>
                      <input
                        className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                        type="number"
                        value={manualJointFingerCount}
                        onChange={(e) => setManualJointFingerCount(Number(e.target.value))}
                      />
                    </label>
                  ) : null}
                </div>
              </div>

              {validation.errors.length > 0 && (
                <div className="rounded-lg border border-red-800 bg-red-950/40 p-3">
                  <div className="text-sm font-medium text-red-300">Errors</div>
                  <ul className="mt-2 space-y-1 text-xs text-red-200">
                    {validation.errors.map((e, i) => (
                      <li key={i}>• {e}</li>
                    ))}
                  </ul>
                </div>
              )}

              {validation.warnings.length > 0 && (
                <div className="rounded-lg border border-amber-800 bg-amber-950/40 p-3">
                  <div className="text-sm font-medium text-amber-300">Warnings</div>
                  <ul className="mt-2 space-y-1 text-xs text-amber-200">
                    {validation.warnings.map((w, i) => (
                      <li key={i}>• {w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {boxWarnings.length > 0 && (
                <div className="rounded-lg border border-amber-800 bg-amber-950/40 p-3">
                  <div className="text-sm font-medium text-amber-300">Warnings</div>
                  <ul className="mt-2 space-y-1 text-xs text-amber-200">
                    {boxWarnings.map((w, i) => (
                      <li key={i}>• {w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {!regressionCheck.passed && (
                <div className="rounded-lg border border-orange-800 bg-orange-950/40 p-3">
                  <div className="text-sm font-medium text-orange-300">Regression Checks</div>
                  <ul className="mt-2 space-y-1 text-xs text-orange-200">
                    {regressionCheck.checks.filter(c => !c.passed).map((c, i) => (
                      <li key={i}>• {c.name}: {c.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={exportAllZip}
                  disabled={!validation.isValid}
                  className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Export ZIP (All)
                </button>
                <button
                  type="button"
                  onClick={exportAllPanels}
                  disabled={!validation.isValid}
                  className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Export All (Individual)
                </button>
                {(Object.keys(svgs) as (keyof HingedBoxSvgs)[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      const filename = generateExportFilename(BoxType.hinged, k);
                      exportSingleSvg(filename, svgs[k]);
                    }}
                    disabled={!validation.isValid}
                    className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Export {k}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-2 flex flex-1 flex-col gap-3 md:mt-0">
          <div className="flex flex-1 flex-col rounded-lg border border-slate-800 bg-slate-900/40 p-3 md:p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex overflow-hidden rounded-md border border-slate-800 bg-slate-950">
                <button
                  type="button"
                  onClick={() => setPreviewMode('2d')}
                  className={
                    previewMode === '2d'
                      ? 'px-3 py-1 text-[11px] font-medium text-slate-950 bg-sky-300'
                      : 'px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-900'
                  }
                >
                  2D Panels
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('faces')}
                  className={
                    previewMode === 'faces'
                      ? 'px-3 py-1 text-[11px] font-medium text-slate-950 bg-sky-300'
                      : 'px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-900'
                  }
                >
                  Faces list
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('3d')}
                  className={
                    previewMode === '3d'
                      ? 'px-3 py-1 text-[11px] font-medium text-slate-950 bg-sky-300'
                      : 'px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-900'
                  }
                >
                  3D
                </button>
              </div>
              {previewMode === '3d' ? <div className="text-[11px] text-slate-400">Hinged 3D preview</div> : null}
            </div>

            {previewMode === '3d' ? (
              <HingedBoxPreview3D input={input} svgs={svgs} />
            ) : previewMode === 'faces' ? (
              <HingedPanelPreview key="faces" svgs={svgs} panels={panels} initialView="faces" artworkOverlays={faceArtworkByFace} />
            ) : (
              <HingedPanelPreview key="2d" svgs={svgs} panels={panels} initialView="all" artworkOverlays={faceArtworkByFace} />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

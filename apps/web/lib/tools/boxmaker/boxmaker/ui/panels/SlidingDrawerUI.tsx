'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { SlidingDrawerInputs, BoxType } from '../../core/types';
import {
  generateSlidingDrawerLayoutSvg,
  generateSlidingDrawerPanels,
  generateSlidingDrawerSvgs,
  generateDrawerDividerSvgs,
} from '../../core/sliding/generateSlidingDrawerSvgs';
import type { PathOperation } from '../../../src/lib/types';
import { importSvgAsFace } from '../../../src/lib/svgImport';
import { buildOverlayGroupSvg, mergeSvgWithOverlays, type EngraveOverlayItem } from '../../core/shared/mergeSvgWithOverlays';
import { computeDrawerDimensions } from '../../core/sliding/drawerMath';
import { exportSingleSvg } from '../../export/exportSvgs';
import { validateSlidingDrawerInputs, calculateRecommendedFingerWidth } from '../../core/validation';
import { generateExportFilename } from '../../core/exportNaming';
import { GOLDEN_PRESETS, adjustPresetForSlidingDrawer } from '../../core/presets';
import { checkSlidingDrawerSvgs } from '../../core/regressionChecks';
import { DRAWER_PRESETS, DEFAULTS } from '../../config/defaults';
import { validateBoxInputs, validateDrawerInputs } from '../../core/shared/validate';
import { exportSlidingDrawerZip } from '../../export/exportZip';
import { SlidingDrawerBoxPreview3D } from './SlidingDrawerBoxPreview3D';
import { SlidingDrawerPanelPreview } from './SlidingDrawerPanelPreview';
import { SlidingDrawerPreview } from './SlidingDrawerPreview';
import { FONTS as SHARED_FONTS, loadFont, textToPathD, type FontId } from '@/lib/fonts/sharedFontRegistry';
import { AIWarningBanner } from '@/components/ai';
import { Trash2 } from 'lucide-react';
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

type SlidingDrawerEngraveTarget =
  | 'outer-back'
  | 'outer-left'
  | 'outer-right'
  | 'outer-bottom'
  | 'outer-top'
  | 'drawer-front'
  | 'drawer-back'
  | 'drawer-left'
  | 'drawer-right'
  | 'drawer-bottom';

function bbox(points: { x: number; y: number }[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY };
}

function panelSize(panel: { outline: { x: number; y: number }[] }) {
  const b = bbox(panel.outline);
  return {
    w: Math.max(1, b.maxX - b.minX),
    h: Math.max(1, b.maxY - b.minY),
  };
}

function injectOverlaysIntoLayoutSvg(layoutSvg: string, overlaysByPanelId: Record<string, string>): string {
  let next = layoutSvg;
  for (const [panelId, overlaySvg] of Object.entries(overlaysByPanelId)) {
    if (!overlaySvg) continue;
    const marker = `data-panel-id="${panelId}"`;
    const idx = next.indexOf(marker);
    if (idx < 0) continue;

    const gOpenIdx = next.lastIndexOf('<g', idx);
    if (gOpenIdx < 0) continue;

    const gOpenEnd = next.indexOf('>', idx);
    if (gOpenEnd < 0) continue;

    const insertAt = gOpenEnd + 1;
    next = `${next.slice(0, insertAt)}${overlaySvg}${next.slice(insertAt)}`;
  }
  return next;
}

function clampNumber(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

interface SlidingDrawerUIProps {
  boxTypeSelector?: ReactNode;
  unitSystem: 'mm' | 'in';
  onResetCallback?: (callback: () => void) => void;
}

export function SlidingDrawerUI({ boxTypeSelector, unitSystem, onResetCallback }: SlidingDrawerUIProps) {
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale, key), [locale]);

  const MM_PER_INCH = 25.4;
  const unitLabel = unitSystem;
  const toUser = (mm: number) => (unitSystem === 'in' ? mm / MM_PER_INCH : mm);
  const fromUser = (val: number) => (unitSystem === 'in' ? val * MM_PER_INCH : val);

  const [widthMm, setWidthMm] = useState(120);
  const [depthMm, setDepthMm] = useState(80);
  const [heightMm, setHeightMm] = useState(60);
  const [thicknessMm, setThicknessMm] = useState(3);
  const [kerfMm, setKerfMm] = useState(0.15);

  const [drawerClearanceMm, setDrawerClearanceMm] = useState(1);
  const [drawerBottomOffsetMm, setDrawerBottomOffsetMm] = useState(0);
  const [frontFaceStyle, setFrontFaceStyle] = useState<'flush' | 'lip'>('flush');
  const [fingerWidthMm, setFingerWidthMm] = useState(10);
  const [autoFitFingers, setAutoFitFingers] = useState(true);

  const [dividersEnabled, setDividersEnabled] = useState(DEFAULTS.drawer.dividersEnabled);
  const [dividerCountX, setDividerCountX] = useState(DEFAULTS.drawer.dividerCountX);
  const [dividerCountZ, setDividerCountZ] = useState(DEFAULTS.drawer.dividerCountZ);
  const [dividerClearanceMm, setDividerClearanceMm] = useState(DEFAULTS.drawer.dividerClearanceMm);

  const [previewMode, setPreviewMode] = useState<'2d' | 'faces' | '3d'>('2d');

  const [engraveOp, setEngraveOp] = useState<PathOperation>('engrave');
  const [engraveTarget, setEngraveTarget] = useState<SlidingDrawerEngraveTarget>('outer-back');
  const [engraveItems, setEngraveItems] = useState<EngraveOverlayItem[]>([]);
  const [selectedEngraveId, setSelectedEngraveId] = useState<string | null>(null);

  const [engraveText, setEngraveText] = useState('');
  const [engraveTextFontId, setEngraveTextFontId] = useState<FontId>(() => (SHARED_FONTS[0]?.id ?? 'Milkshake'));
  const [engraveTextSizeMm, setEngraveTextSizeMm] = useState(10);
  const [engraveTextLetterSpacingMm, setEngraveTextLetterSpacingMm] = useState(0);
  const [engraveTextCurved, setEngraveTextCurved] = useState(false);
  const [engraveTextCurveRadius, setEngraveTextCurveRadius] = useState(30);
  const [textPreviewSvg, setTextPreviewSvg] = useState<string | null>(null);

  const [faceArtworkTargets, setFaceArtworkTargets] = useState<string[]>(['outer-back']);
  const [faceArtworkPrompt, setFaceArtworkPrompt] = useState<string>('');
  const [faceArtworkByPanelId, setFaceArtworkByPanelId] = useState<Record<string, FaceArtworkConfig | undefined>>({});
  const [selectedArtworkPanelId, setSelectedArtworkPanelId] = useState<string>('outer-back');
  const [isArtworkGenerating, setIsArtworkGenerating] = useState(false);
  const [artworkError, setArtworkError] = useState<string | null>(null);

  const { input, svgs, panels, layoutSvg, dims, validation, dividerSvgs } = useMemo(() => {
    const input: SlidingDrawerInputs = {
      widthMm: clampNumber(widthMm, 10, 5000),
      depthMm: clampNumber(depthMm, 10, 5000),
      heightMm: clampNumber(heightMm, 10, 5000),
      thicknessMm: clampNumber(thicknessMm, 1, 50),
      kerfMm: clampNumber(kerfMm, 0, 1),
      drawerClearanceMm: clampNumber(drawerClearanceMm, 0, 50),
      drawerBottomOffsetMm: clampNumber(drawerBottomOffsetMm, 0, heightMm / 2),
      frontFaceStyle,
      fingerWidthMm: clampNumber(fingerWidthMm, 2, 200),
      autoFitFingers,
      dividersEnabled,
      dividerCountX: Math.max(1, Math.floor(dividerCountX)),
      dividerCountZ: Math.max(1, Math.floor(dividerCountZ)),
      dividerClearanceMm: clampNumber(dividerClearanceMm, 0, 2),
    };

    const validation = validateSlidingDrawerInputs(input);
    const dims = computeDrawerDimensions(input);
    const panels = generateSlidingDrawerPanels(input);
    const baseSvgs = generateSlidingDrawerSvgs(input);

    const mergedSvgs = {
      outer: {
        back: mergeSvgWithOverlays(
          baseSvgs.outer.back,
          engraveItems.filter((it) => it.id.startsWith('outer-back:')),
        ),
        left: mergeSvgWithOverlays(
          baseSvgs.outer.left,
          engraveItems.filter((it) => it.id.startsWith('outer-left:')),
        ),
        right: mergeSvgWithOverlays(
          baseSvgs.outer.right,
          engraveItems.filter((it) => it.id.startsWith('outer-right:')),
        ),
        bottom: mergeSvgWithOverlays(
          baseSvgs.outer.bottom,
          engraveItems.filter((it) => it.id.startsWith('outer-bottom:')),
        ),
        top: baseSvgs.outer.top
          ? mergeSvgWithOverlays(baseSvgs.outer.top, engraveItems.filter((it) => it.id.startsWith('outer-top:')))
          : undefined,
      },
      drawer: {
        front: mergeSvgWithOverlays(
          baseSvgs.drawer.front,
          engraveItems.filter((it) => it.id.startsWith('drawer-front:')),
        ),
        back: mergeSvgWithOverlays(
          baseSvgs.drawer.back,
          engraveItems.filter((it) => it.id.startsWith('drawer-back:')),
        ),
        left: mergeSvgWithOverlays(
          baseSvgs.drawer.left,
          engraveItems.filter((it) => it.id.startsWith('drawer-left:')),
        ),
        right: mergeSvgWithOverlays(
          baseSvgs.drawer.right,
          engraveItems.filter((it) => it.id.startsWith('drawer-right:')),
        ),
        bottom: mergeSvgWithOverlays(
          baseSvgs.drawer.bottom,
          engraveItems.filter((it) => it.id.startsWith('drawer-bottom:')),
        ),
      },
      frontFace: baseSvgs.frontFace,
    };

    const baseLayoutSvg = generateSlidingDrawerLayoutSvg(panels);
    const overlaysByPanelId: Record<string, string> = {
      'outer-back': buildOverlayGroupSvg(engraveItems.filter((it) => it.id.startsWith('outer-back:'))),
      'outer-left': buildOverlayGroupSvg(engraveItems.filter((it) => it.id.startsWith('outer-left:'))),
      'outer-right': buildOverlayGroupSvg(engraveItems.filter((it) => it.id.startsWith('outer-right:'))),
      'outer-bottom': buildOverlayGroupSvg(engraveItems.filter((it) => it.id.startsWith('outer-bottom:'))),
      'outer-top': buildOverlayGroupSvg(engraveItems.filter((it) => it.id.startsWith('outer-top:'))),
      'drawer-front': buildOverlayGroupSvg(engraveItems.filter((it) => it.id.startsWith('drawer-front:'))),
      'drawer-back': buildOverlayGroupSvg(engraveItems.filter((it) => it.id.startsWith('drawer-back:'))),
      'drawer-left': buildOverlayGroupSvg(engraveItems.filter((it) => it.id.startsWith('drawer-left:'))),
      'drawer-right': buildOverlayGroupSvg(engraveItems.filter((it) => it.id.startsWith('drawer-right:'))),
      'drawer-bottom': buildOverlayGroupSvg(engraveItems.filter((it) => it.id.startsWith('drawer-bottom:'))),
    };
    const layoutSvg = injectOverlaysIntoLayoutSvg(baseLayoutSvg, overlaysByPanelId);

    const dividerSvgs = generateDrawerDividerSvgs(input);

    return { input, svgs: mergedSvgs, panels, layoutSvg, dims, validation, dividerSvgs };
  }, [
    widthMm,
    depthMm,
    heightMm,
    thicknessMm,
    kerfMm,
    drawerClearanceMm,
    drawerBottomOffsetMm,
    frontFaceStyle,
    fingerWidthMm,
    autoFitFingers,
    dividersEnabled,
    dividerCountX,
    dividerCountZ,
    dividerClearanceMm,
    engraveItems,
  ]);

  const artworkPanelIds = useMemo(() => {
    const out: string[] = [];
    out.push('outer-back', 'outer-left', 'outer-right', 'outer-bottom');
    if (panels.outer.top) out.push('outer-top');
    out.push('drawer-front', 'drawer-back', 'drawer-left', 'drawer-right', 'drawer-bottom');
    return out;
  }, [panels.outer.top]);

  const panelDimsById = useMemo(() => {
    const out = new Map<string, { w: number; h: number }>();
    out.set('outer-back', panelSize(panels.outer.back));
    out.set('outer-left', panelSize(panels.outer.left));
    out.set('outer-right', panelSize(panels.outer.right));
    out.set('outer-bottom', panelSize(panels.outer.bottom));
    if (panels.outer.top) out.set('outer-top', panelSize(panels.outer.top));
    out.set('drawer-front', panelSize(panels.drawer.front));
    out.set('drawer-back', panelSize(panels.drawer.back));
    out.set('drawer-left', panelSize(panels.drawer.left));
    out.set('drawer-right', panelSize(panels.drawer.right));
    out.set('drawer-bottom', panelSize(panels.drawer.bottom));
    return out;
  }, [panels]);

  useEffect(() => {
    if (!artworkPanelIds.length) return;
    if (artworkPanelIds.includes(selectedArtworkPanelId)) return;
    setSelectedArtworkPanelId(artworkPanelIds[0]);
  }, [artworkPanelIds, selectedArtworkPanelId]);

  const selectedArtwork = selectedArtworkPanelId ? faceArtworkByPanelId[selectedArtworkPanelId] ?? null : null;

  const setSelectedArtworkPlacement = (patch: Partial<FaceArtworkPlacement>) => {
    if (!selectedArtworkPanelId) return;
    setFaceArtworkByPanelId((prev) => {
      const cur = prev[selectedArtworkPanelId];
      if (!cur) return prev;
      return {
        ...prev,
        [selectedArtworkPanelId]: {
          ...cur,
          placement: {
            ...cur.placement,
            ...patch,
          },
        },
      };
    });
  };

  const toggleArtworkTarget = (panelId: string) => {
    setFaceArtworkTargets((prev) => {
      const has = prev.includes(panelId);
      const next = has ? prev.filter((x) => x !== panelId) : [...prev, panelId];
      return next.length ? next : prev;
    });
  };

  const handleGenerateArtwork = async () => {
    const prompt = faceArtworkPrompt.trim();
    if (!prompt) {
      setArtworkError('Please enter a prompt');
      return;
    }

    const targets = faceArtworkTargets.filter((t) => artworkPanelIds.includes(t));
    if (targets.length === 0) {
      setArtworkError('Select at least one face');
      return;
    }

    setIsArtworkGenerating(true);
    setArtworkError(null);

    try {
      // Always request white background for AI artwork
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
          throw new Error(errJson?.error || 'AI generation failed');
        }
        const text = await res.text().catch(() => '');
        throw new Error(text || 'AI generation failed');
      }

      const json: any = await res.json().catch(() => ({}));
      const dataUrl = typeof json?.dataUrl === 'string' ? json.dataUrl : '';
      if (!dataUrl) {
        throw new Error('AI image endpoint returned no dataUrl');
      }

      setFaceArtworkByPanelId((prev) => {
        const next = { ...prev };
        for (const panelId of targets) {
          const dims = panelDimsById.get(panelId);
          const w = Math.max(dims?.w ?? 1, 1);
          const h = Math.max(dims?.h ?? 1, 1);
          const existing = next[panelId];
          next[panelId] = {
            prompt,
            imageDataUrl: dataUrl,
            placement: existing?.placement ?? { x: w / 2, y: h / 2, scale: 0.5, rotationDeg: 0 },
          };
        }
        return next;
      });

      if (!targets.includes(selectedArtworkPanelId)) {
        setSelectedArtworkPanelId(targets[0]);
      }
    } catch (e) {
      setArtworkError(e instanceof Error ? e.message : 'AI generation failed');
    } finally {
      setIsArtworkGenerating(false);
    }
  };

  const handleTraceSelectedArtwork = async () => {
    const panelId = String(selectedArtworkPanelId || '').trim();
    const art = panelId ? faceArtworkByPanelId[panelId] : null;
    const dims = panelId ? panelDimsById.get(panelId) ?? null : null;

    if (!panelId || !art?.imageDataUrl || !dims) {
      setArtworkError('Select a panel with artwork to trace');
      return;
    }

    setIsArtworkGenerating(true);
    setArtworkError(null);

    try {
      const res = await fetch('/api/trace/potrace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataUrl: art.imageDataUrl,
          mode: 'CUT_SILHOUETTE',
          targetWidthMm: dims.w,
          targetHeightMm: dims.h,
        }),
      });

      const json: any = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        throw new Error((typeof json?.error === 'string' && json.error) || 'Trace failed');
      }

      const paths: string[] = Array.isArray(json?.paths) ? json.paths.filter((p: any) => typeof p === 'string') : [];
      if (!paths.length) {
        throw new Error('Trace returned no paths');
      }

      const svgText = `<svg xmlns="http://www.w3.org/2000/svg">${paths
        .map((d) => `<path d="${d}" />`)
        .join('')}</svg>`;

      const op: PathOperation = 'cut';
      const face = importSvgAsFace({
        svgText,
        id: `trace-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        op,
        label: `trace-${panelId}`,
      });

      if (!face) {
        throw new Error('Trace result could not be imported as SVG');
      }

      const id = `${panelId}:${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setEngraveItems((prev) => [
        ...prev,
        {
          id,
          fileName: `trace-${panelId}.svg`,
          op,
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
      setEngraveTarget(panelId as SlidingDrawerEngraveTarget);
    } catch (e) {
      setArtworkError(e instanceof Error ? e.message : 'Trace failed');
    } finally {
      setIsArtworkGenerating(false);
    }
  };

  const artworkOverlays = useMemo(() => {
    const out: Record<
      string,
      {
        imageDataUrl: string;
        placement: { x: number; y: number; scale: number; rotationDeg: number };
        panelW: number;
        panelH: number;
      }
    > = {};
    for (const panelId of artworkPanelIds) {
      const art = faceArtworkByPanelId[panelId];
      const dims = panelDimsById.get(panelId);
      if (!art || !art.imageDataUrl || !dims) continue;
      out[panelId] = { imageDataUrl: art.imageDataUrl, placement: art.placement, panelW: dims.w, panelH: dims.h };
    }
    return out;
  }, [artworkPanelIds, faceArtworkByPanelId, panelDimsById]);

  const selectedEngraveItem = selectedEngraveId ? engraveItems.find((x) => x.id === selectedEngraveId) ?? null : null;

  const setSelectedEngravePlacement = (patch: Partial<EngraveOverlayItem['placement']>) => {
    if (!selectedEngraveId) return;
    setEngraveItems((prev) =>
      prev.map((it) => (it.id === selectedEngraveId ? { ...it, placement: { ...it.placement, ...patch } } : it)),
    );
  };

  // Real-time text preview - always use fixed 30mm size for preview display
  useEffect(() => {
    const previewText = engraveText.trim() || 'Preview';
    const previewSize = 30; // Fixed preview size for better visibility
    let cancelled = false;

    (async () => {
      try {
        const font = await loadFont(engraveTextFontId);
        const res = textToPathD(font, previewText, previewSize, Math.max(0, engraveTextLetterSpacingMm));
        if (cancelled || !res?.pathD) return;

        const pathD = res.pathD;
        const bounds = res.bbox || { x: 0, y: 0, width: 100, height: 30 };
        const pad = 4;

        // Center the text in the viewBox
        const viewBox = `${bounds.x - pad} ${bounds.y - pad} ${bounds.width + pad * 2} ${bounds.height + pad * 2}`;
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%">
          <path d="${pathD}" fill="#fff" stroke="none" />
        </svg>`;
        setTextPreviewSvg(svg);
      } catch {
        setTextPreviewSvg(null);
      }
    })();

    return () => { cancelled = true; };
  }, [engraveText, engraveTextFontId, engraveTextLetterSpacingMm]);

  const handleAddEngraveText = async () => {
    const text = engraveText.trim();
    if (!text) return;

    const font = await loadFont(engraveTextFontId);
    const res = textToPathD(font, text, Math.max(0.1, engraveTextSizeMm), Math.max(0, engraveTextLetterSpacingMm));
    if (!res?.pathD) return;

    const svgText = `<svg xmlns="http://www.w3.org/2000/svg"><path d="${res.pathD}" /></svg>`;

    const face = importSvgAsFace({
      svgText,
      id: `text-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      op: engraveOp,
      label: `text-${text}`,
    });
    if (!face) return;

    const targetPanel =
      engraveTarget === 'outer-back'
        ? panels.outer.back
        : engraveTarget === 'outer-left'
          ? panels.outer.left
          : engraveTarget === 'outer-right'
            ? panels.outer.right
            : engraveTarget === 'outer-bottom'
              ? panels.outer.bottom
              : engraveTarget === 'outer-top'
                ? panels.outer.top ?? panels.outer.bottom
                : engraveTarget === 'drawer-front'
                  ? panels.drawer.front
                  : engraveTarget === 'drawer-back'
                    ? panels.drawer.back
                    : engraveTarget === 'drawer-left'
                      ? panels.drawer.left
                      : engraveTarget === 'drawer-right'
                        ? panels.drawer.right
                        : panels.drawer.bottom;

    const b = bbox(targetPanel.outline);
    const targetCx = (b.minX + b.maxX) / 2;
    const targetCy = (b.minY + b.maxY) / 2;

    const id = `${engraveTarget}:${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setEngraveItems((prev) => [
      ...prev,
      {
        id,
        fileName: `text-${text}.svg`,
        op: engraveOp,
        face,
        placement: { x: targetCx, y: targetCy, rotation: 0, scale: 1 },
      },
    ]);
    setSelectedEngraveId(id);
  };

  function exportAllPanels() {
    const outerKeys = ['back', 'left', 'right', 'bottom'] as const;
    outerKeys.forEach((k) => {
      const filename = generateExportFilename(BoxType.slidingDrawer, `outer-${k}`);
      exportSingleSvg(filename, svgs.outer[k]);
    });
    if (svgs.outer.top) {
      const filename = generateExportFilename(BoxType.slidingDrawer, 'outer-top');
      exportSingleSvg(filename, svgs.outer.top);
    }

    const drawerKeys = ['front', 'back', 'left', 'right', 'bottom'] as const;
    drawerKeys.forEach((k) => {
      const filename = generateExportFilename(BoxType.slidingDrawer, `drawer-${k}`);
      exportSingleSvg(filename, svgs.drawer[k]);
    });

    if (svgs.frontFace) {
      const filename = generateExportFilename(BoxType.slidingDrawer, 'frontface');
      exportSingleSvg(filename, svgs.frontFace);
    }

    for (const divider of dividerSvgs) {
      const filename = generateExportFilename(BoxType.slidingDrawer, divider.name);
      exportSingleSvg(filename, divider.svg);
    }
  }

  async function exportAllZip() {
    await exportSlidingDrawerZip(
      svgs,
      input.widthMm,
      input.depthMm,
      input.heightMm,
      input.thicknessMm,
      input.kerfMm,
      dividerSvgs
    );
  }

  const recommendedFinger = useMemo(
    () => calculateRecommendedFingerWidth(widthMm, depthMm, heightMm),
    [widthMm, depthMm, heightMm]
  );

  function applyPreset(presetName: string) {
    const preset = GOLDEN_PRESETS.find((p) => p.name === presetName);
    if (!preset) return;
    
    const adjusted = adjustPresetForSlidingDrawer(preset);
    setWidthMm(adjusted.widthMm);
    setDepthMm(adjusted.depthMm);
    setHeightMm(adjusted.heightMm);
    setThicknessMm(adjusted.thicknessMm);
    setKerfMm(adjusted.kerfMm);
    setFingerWidthMm(adjusted.fingerWidthMm);
    setDrawerClearanceMm(adjusted.drawerClearanceMm);
    setDrawerBottomOffsetMm(adjusted.drawerBottomOffsetMm);
  }

  const regressionCheck = useMemo(() => {
    return checkSlidingDrawerSvgs(svgs);
  }, [svgs]);

  const boxWarnings = useMemo(() => {
    const warnings = validateBoxInputs({
      widthMm: input.widthMm,
      depthMm: input.depthMm,
      heightMm: input.heightMm,
      thicknessMm: input.thicknessMm,
      kerfMm: input.kerfMm,
      fingerWidthMm: input.fingerWidthMm,
    });
    const drawerWarnings = validateDrawerInputs({
      widthMm: input.widthMm,
      thicknessMm: input.thicknessMm,
      kerfMm: input.kerfMm,
      clearanceMm: input.drawerClearanceMm,
    });
    return [...warnings, ...drawerWarnings];
  }, [input]);

  function applyBoxPreset(presetName: string) {
    const preset = DRAWER_PRESETS.find((p) => p.name === presetName);
    if (!preset) return;
    
    setWidthMm(preset.widthMm);
    setDepthMm(preset.depthMm);
    setHeightMm(preset.heightMm);
    setThicknessMm(preset.thicknessMm);
  }

  function resetToDefaults() {
    setWidthMm(DEFAULTS.drawer.widthMm);
    setDepthMm(DEFAULTS.drawer.depthMm);
    setHeightMm(DEFAULTS.drawer.heightMm);
    setThicknessMm(DEFAULTS.common.thicknessMm);
    setKerfMm(DEFAULTS.common.kerfMm);
    setFingerWidthMm(DEFAULTS.drawer.fingerWidthMm);
    setDrawerClearanceMm(DEFAULTS.drawer.drawerClearanceMm);
    setDrawerBottomOffsetMm(DEFAULTS.drawer.drawerBottomOffsetMm);
    setFrontFaceStyle(DEFAULTS.drawer.frontFaceStyle);
    setAutoFitFingers(DEFAULTS.drawer.autoFitFingers);
    setDividersEnabled(DEFAULTS.drawer.dividersEnabled);
    setDividerCountX(DEFAULTS.drawer.dividerCountX);
    setDividerCountZ(DEFAULTS.drawer.dividerCountZ);
    setDividerClearanceMm(DEFAULTS.drawer.dividerClearanceMm);
    setEngraveItems([]);
    setSelectedEngraveId(null);
    setEngraveTarget('outer-back');
    setFaceArtworkTargets(['outer-back']);
    setFaceArtworkPrompt('');
    setFaceArtworkByPanelId({});
    setSelectedArtworkPanelId('outer-back');
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
            <h1 className="text-sm font-semibold text-slate-100 md:text-base">LaserFilesPro Box Maker</h1>
            <p className="text-[11px] text-slate-400">{t('boxmaker.sliding_subtitle')}</p>
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
                <div className="text-sm font-medium text-slate-100">{t('boxmaker.box_presets')}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {DRAWER_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => applyBoxPreset(preset.name)}
                      className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
                      title={preset.description}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">{t('boxmaker.face_artwork')}</div>
                <div className="mt-1 text-[11px] text-slate-400">{t('boxmaker.preview_only')}</div>

                <div className="mt-3">
                  <AIWarningBanner />
                </div>

                <div className="mt-3 grid gap-2">
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">{t('boxmaker.prompt')}</div>
                    <input
                      type="text"
                      value={faceArtworkPrompt}
                      onChange={(e) => setFaceArtworkPrompt(e.target.value)}
                      placeholder={t('boxmaker.prompt_placeholder')}
                      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                    />
                  </label>

                  <div className="grid gap-1">
                    <div className="text-[11px] text-slate-400">{t('boxmaker.panels')}</div>
                    <div className="flex flex-wrap gap-2">
                      {artworkPanelIds.map((k) => (
                        <label key={k} className="flex items-center gap-1 text-[11px] text-slate-200">
                          <input type="checkbox" checked={faceArtworkTargets.includes(k)} onChange={() => toggleArtworkTarget(k)} />
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
                      {isArtworkGenerating ? t('boxmaker.generating') : t('boxmaker.generate')}
                    </button>
                    <button
                      type="button"
                      onClick={handleTraceSelectedArtwork}
                      disabled={isArtworkGenerating}
                      className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-60"
                    >
                      {t('boxmaker.trace_svg')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFaceArtworkByPanelId({});
                        setArtworkError(null);
                      }}
                      className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
                    >
                      {t('boxmaker.clear')}
                    </button>
                  </div>

                  {artworkError ? (
                    <div className="rounded-md border border-amber-800 bg-amber-950/30 p-2 text-[11px] text-amber-200">{artworkError}</div>
                  ) : null}

                  <div className="grid grid-cols-2 gap-2">
                    <label className="grid gap-1">
                      <div className="text-[11px] text-slate-400">{t('boxmaker.edit_panel')}</div>
                      <select
                        value={selectedArtworkPanelId}
                        onChange={(e) => setSelectedArtworkPanelId(e.target.value)}
                        className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                      >
                        {artworkPanelIds.map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="text-[11px] text-slate-500 self-end">{t('boxmaker.center_based_xy')}</div>
                  </div>

                  {selectedArtwork ? (
                    <div className="grid grid-cols-2 gap-2">
                      <label className="grid gap-1">
                        <div className="text-[11px] text-slate-400">{t('boxmaker.x_mm')}</div>
                        <input
                          type="number"
                          value={Number(selectedArtwork.placement.x.toFixed(2))}
                          onChange={(e) => setSelectedArtworkPlacement({ x: Number(e.target.value) || 0 })}
                          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                        />
                      </label>
                      <label className="grid gap-1">
                        <div className="text-[11px] text-slate-400">{t('boxmaker.y_mm')}</div>
                        <input
                          type="number"
                          value={Number(selectedArtwork.placement.y.toFixed(2))}
                          onChange={(e) => setSelectedArtworkPlacement({ y: Number(e.target.value) || 0 })}
                          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                        />
                      </label>
                      <label className="grid gap-1">
                        <div className="text-[11px] text-slate-400">{t('boxmaker.scale')}</div>
                        <input
                          type="number"
                          min={0.05}
                          step={0.05}
                          value={Number(selectedArtwork.placement.scale.toFixed(2))}
                          onChange={(e) => setSelectedArtworkPlacement({ scale: Math.max(0.05, Number(e.target.value) || 0.05) })}
                          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                        />
                      </label>
                      <label className="grid gap-1">
                        <div className="text-[11px] text-slate-400">{t('boxmaker.rotate_deg')}</div>
                        <input
                          type="number"
                          step={1}
                          value={Number(selectedArtwork.placement.rotationDeg.toFixed(0))}
                          onChange={(e) => setSelectedArtworkPlacement({ rotationDeg: Number(e.target.value) || 0 })}
                          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500">{t('boxmaker.no_artwork_panel')}</div>
                  )}
                </div>
              </div>

              {selectedEngraveItem ? (
                <div className="mt-2 rounded-md border border-slate-800 bg-slate-950/40 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] text-slate-400">{t('boxmaker.placement')}</div>
                    <button
                      type="button"
                      onClick={() => {
                        setEngraveItems((prev) => prev.filter((x) => x.id !== selectedEngraveItem.id));
                        setSelectedEngraveId(null);
                      }}
                      className="rounded p-1 text-rose-400 hover:bg-slate-800 hover:text-rose-300"
                      title={t('boxmaker.delete_layer')}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                      <span>{t('boxmaker.x')} ({unitLabel})</span>
                      <input
                        type="number"
                        step={unitSystem === 'in' ? 0.01 : 0.1}
                        value={toUser(selectedEngraveItem.placement.x)}
                        onChange={(e) => setSelectedEngravePlacement({ x: fromUser(Number(e.target.value)) })}
                        className="w-24 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                      <span>{t('boxmaker.y')} ({unitLabel})</span>
                      <input
                        type="number"
                        step={unitSystem === 'in' ? 0.01 : 0.1}
                        value={toUser(selectedEngraveItem.placement.y)}
                        onChange={(e) => setSelectedEngravePlacement({ y: fromUser(Number(e.target.value)) })}
                        className="w-24 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                      <span>{t('boxmaker.rotation_deg')}</span>
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
                      <span>{t('boxmaker.scale')}</span>
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
                <div className="text-sm font-medium text-slate-100">{t('boxmaker.outer_box_dimensions')}</div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">{t('boxmaker.width')} ({unitLabel})</div>
                    <input
                      type="number"
                      step={unitSystem === 'in' ? 0.01 : 0.1}
                      value={toUser(widthMm)}
                      onChange={(e) => setWidthMm(fromUser(Number(e.target.value)))}
                      className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    />
                  </label>
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">{t('boxmaker.depth')} ({unitLabel})</div>
                    <input
                      type="number"
                      step={unitSystem === 'in' ? 0.01 : 0.1}
                      value={toUser(depthMm)}
                      onChange={(e) => setDepthMm(fromUser(Number(e.target.value)))}
                      className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    />
                  </label>
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">{t('boxmaker.height')} ({unitLabel})</div>
                    <input
                      type="number"
                      step={unitSystem === 'in' ? 0.01 : 0.1}
                      value={toUser(heightMm)}
                      onChange={(e) => setHeightMm(fromUser(Number(e.target.value)))}
                      className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">{t('boxmaker.material')}</div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">{t('boxmaker.thickness')} ({unitLabel})</div>
                    <input
                      type="number"
                      step={unitSystem === 'in' ? 0.01 : 0.1}
                      value={toUser(thicknessMm)}
                      onChange={(e) => setThicknessMm(fromUser(Number(e.target.value)))}
                      className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    />
                  </label>
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">{t('boxmaker.kerf')} ({unitLabel})</div>
                    <input
                      type="number"
                      step={unitSystem === 'in' ? 0.001 : 0.01}
                      value={toUser(kerfMm)}
                      onChange={(e) => setKerfMm(fromUser(Number(e.target.value)))}
                      className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">{t('boxmaker.drawer_settings')}</div>
                <div className="mt-3 grid gap-3">
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">{t('boxmaker.clearance')} ({unitLabel})</div>
                    <input
                      type="number"
                      step={unitSystem === 'in' ? 0.01 : 0.1}
                      value={toUser(drawerClearanceMm)}
                      onChange={(e) => setDrawerClearanceMm(fromUser(Number(e.target.value)))}
                      className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    />
                  </label>
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">{t('boxmaker.bottom_offset')} ({unitLabel})</div>
                    <input
                      type="number"
                      step={unitSystem === 'in' ? 0.01 : 0.1}
                      value={toUser(drawerBottomOffsetMm)}
                      onChange={(e) => setDrawerBottomOffsetMm(fromUser(Number(e.target.value)))}
                      className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    />
                  </label>
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">{t('boxmaker.front_face_style')}</div>
                    <select
                      value={frontFaceStyle}
                      onChange={(e) => setFrontFaceStyle(e.target.value as 'flush' | 'lip')}
                      className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    >
                      <option value="flush">{t('boxmaker.flush')}</option>
                      <option value="lip">{t('boxmaker.lip')}</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">{t('boxmaker.finger_joints')}</div>
                <div className="mt-3 grid gap-3">
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">{t('boxmaker.finger_width')} ({unitLabel})</div>
                    <input
                      type="number"
                      step={unitSystem === 'in' ? 0.01 : 0.1}
                      value={toUser(fingerWidthMm)}
                      onChange={(e) => setFingerWidthMm(fromUser(Number(e.target.value)))}
                      className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    />
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={autoFitFingers}
                      onChange={(e) => setAutoFitFingers(e.target.checked)}
                      className="rounded border-slate-800"
                    />
                    <span className="text-xs text-slate-300">{t('boxmaker.auto_fit_fingers')}</span>
                  </label>
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">{t('boxmaker.drawer_dividers')}</div>
                <div className="mt-3 grid gap-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={dividersEnabled}
                      onChange={(e) => setDividersEnabled(e.target.checked)}
                      className="rounded border-slate-800"
                    />
                    <span className="text-xs text-slate-300">{t('boxmaker.enable_dividers')}</span>
                  </label>
                  {dividersEnabled && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="grid gap-1">
                          <div className="text-[11px] text-slate-400">{t('boxmaker.compartments_x')}</div>
                          <input
                            type="number"
                            min={1}
                            max={20}
                            step={1}
                            value={dividerCountX}
                            onChange={(e) => setDividerCountX(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                            className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                          />
                        </label>
                        <label className="grid gap-1">
                          <div className="text-[11px] text-slate-400">{t('boxmaker.compartments_z')}</div>
                          <input
                            type="number"
                            min={1}
                            max={20}
                            step={1}
                            value={dividerCountZ}
                            onChange={(e) => setDividerCountZ(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                            className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                          />
                        </label>
                      </div>
                      <label className="grid gap-1">
                        <div className="text-[11px] text-slate-400">{t('boxmaker.slot_clearance')} ({unitLabel})</div>
                        <input
                          type="number"
                          step={unitSystem === 'in' ? 0.001 : 0.01}
                          value={toUser(dividerClearanceMm)}
                          onChange={(e) => setDividerClearanceMm(fromUser(Number(e.target.value)))}
                          className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                        />
                      </label>
                      <div className="text-[10px] text-slate-500">
                        Creates {Math.max(0, dividerCountX - 1)} X-divider{dividerCountX - 1 !== 1 ? 's' : ''} and {Math.max(0, dividerCountZ - 1)} Z-divider{dividerCountZ - 1 !== 1 ? 's' : ''} for the inner drawer.
                      </div>
                    </>
                  )}
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

                        const targetPanel =
                          engraveTarget === 'outer-back'
                              ? panels.outer.back
                              : engraveTarget === 'outer-left'
                                ? panels.outer.left
                                : engraveTarget === 'outer-right'
                                  ? panels.outer.right
                                  : engraveTarget === 'outer-bottom'
                                    ? panels.outer.bottom
                                    : engraveTarget === 'outer-top'
                                      ? panels.outer.top ?? panels.outer.bottom
                                      : engraveTarget === 'drawer-front'
                                        ? panels.drawer.front
                                        : engraveTarget === 'drawer-back'
                                          ? panels.drawer.back
                                          : engraveTarget === 'drawer-left'
                                            ? panels.drawer.left
                                            : engraveTarget === 'drawer-right'
                                              ? panels.drawer.right
                                              : panels.drawer.bottom;

                        const b = bbox(targetPanel.outline);
                        const targetCx = (b.minX + b.maxX) / 2;
                        const targetCy = (b.minY + b.maxY) / 2;

                        const id = `${engraveTarget}:${Date.now()}-${Math.random().toString(16).slice(2)}`;
                        setEngraveItems((prev) => [
                          ...prev,
                          {
                            id,
                            fileName: f.name,
                            op: engraveOp,
                            face,
                            placement: { x: targetCx, y: targetCy, rotation: 0, scale: 1 },
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
                        onChange={(e) => setEngraveTarget(e.target.value as SlidingDrawerEngraveTarget)}
                        className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                      >
                        <optgroup label={t('boxmaker.outer')}>
                          <option value="outer-back">outer-back</option>
                          <option value="outer-left">outer-left</option>
                          <option value="outer-right">outer-right</option>
                          <option value="outer-bottom">outer-bottom</option>
                          <option value="outer-top">outer-top</option>
                        </optgroup>
                        <optgroup label={t('boxmaker.drawer')}>
                          <option value="drawer-front">drawer-front</option>
                          <option value="drawer-back">drawer-back</option>
                          <option value="drawer-left">drawer-left</option>
                          <option value="drawer-right">drawer-right</option>
                          <option value="drawer-bottom">drawer-bottom</option>
                        </optgroup>
                      </select>
                    </label>
                  </div>

                  <div className="grid gap-2 rounded-md border border-slate-800 bg-slate-950/40 p-2">
                    <div className="text-[11px] text-slate-400">{t('boxmaker.add_text')}</div>
                    <div className="grid gap-2">
                      <input
                        type="text"
                        value={engraveText}
                        onChange={(e) => setEngraveText(e.target.value)}
                        placeholder={t('boxmaker.text_placeholder')}
                        className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                      />
                      {/* Font preview */}
                      {textPreviewSvg && (
                        <div
                          className="h-12 w-full rounded-md border border-slate-700 bg-slate-950 p-1"
                          dangerouslySetInnerHTML={{ __html: textPreviewSvg }}
                        />
                      )}
                      <div className="grid grid-cols-3 gap-2">
                        <label className="grid gap-1">
                          <div className="text-[11px] text-slate-400">{t('boxmaker.font')}</div>
                          <select
                            value={engraveTextFontId}
                            onChange={(e) => setEngraveTextFontId(e.target.value as FontId)}
                            className="w-full rounded-md border border-slate-700 bg-slate-900 px-1 py-1 text-[10px] text-slate-200"
                          >
                            {SHARED_FONTS.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="grid gap-1">
                          <div className="text-[11px] text-slate-400">{t('boxmaker.size')}</div>
                          <input
                            type="number"
                            min={0.1}
                            step={0.5}
                            value={engraveTextSizeMm}
                            onChange={(e) => setEngraveTextSizeMm(Number(e.target.value) || 0)}
                            className="w-full rounded-md border border-slate-700 bg-slate-900 px-1 py-1 text-[10px] text-slate-200"
                          />
                        </label>
                        <label className="grid gap-1">
                          <div className="text-[11px] text-slate-400">{t('boxmaker.spacing')}</div>
                          <input
                            type="number"
                            step={0.1}
                            value={engraveTextLetterSpacingMm}
                            onChange={(e) => setEngraveTextLetterSpacingMm(Number(e.target.value) || 0)}
                            className="w-full rounded-md border border-slate-700 bg-slate-900 px-1 py-1 text-[10px] text-slate-200"
                          />
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddEngraveText}
                        className="w-full rounded-md bg-slate-800 px-3 py-2 text-[11px] text-slate-100 hover:bg-slate-700"
                      >
                        {t('boxmaker.add_text_button')}
                      </button>
                    </div>
                  </div>

                  {engraveItems.length > 0 ? (
                    <div className="mt-1 space-y-1">
                      {engraveItems.map((item) => (
                        <div
                          key={item.id}
                          className={
                            selectedEngraveId === item.id
                              ? 'flex w-full items-center gap-2 rounded-md border border-sky-500 bg-slate-900 px-2 py-1 text-[11px] text-slate-100'
                              : 'flex w-full items-center gap-2 rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-300 hover:border-slate-600'
                          }
                        >
                          <button type="button" onClick={() => setSelectedEngraveId(item.id)} className="min-w-0 flex-1 truncate text-left">
                            {item.fileName}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEngraveItems((prev) => prev.filter((x) => x.id !== item.id));
                              setSelectedEngraveId((prev) => (prev === item.id ? null : prev));
                            }}
                            className="rounded p-1 text-rose-400 hover:bg-slate-800 hover:text-rose-300"
                            title={t('boxmaker.delete_layer')}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              {validation.errors.length > 0 && (
                <div className="rounded-lg border border-red-800 bg-red-950/40 p-3">
                  <div className="text-sm font-medium text-red-300">{t('boxmaker.errors')}</div>
                  <ul className="mt-2 space-y-1 text-xs text-red-200">
                    {validation.errors.map((e, i) => (
                      <li key={i}>• {e}</li>
                    ))}
                  </ul>
                </div>
              )}

              {validation.warnings.length > 0 && (
                <div className="rounded-lg border border-amber-800 bg-amber-950/40 p-3">
                  <div className="text-sm font-medium text-amber-300">{t('boxmaker.warnings')}</div>
                  <ul className="mt-2 space-y-1 text-xs text-amber-200">
                    {validation.warnings.map((w, i) => (
                      <li key={i}>• {w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {boxWarnings.length > 0 && (
                <div className="rounded-lg border border-amber-800 bg-amber-950/40 p-3">
                  <div className="text-sm font-medium text-amber-300">{t('boxmaker.warnings')}</div>
                  <ul className="mt-2 space-y-1 text-xs text-amber-200">
                    {boxWarnings.map((w, i) => (
                      <li key={i}>• {w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {!regressionCheck.passed && (
                <div className="rounded-lg border border-orange-800 bg-orange-950/40 p-3">
                  <div className="text-sm font-medium text-orange-300">{t('boxmaker.regression_checks')}</div>
                  <ul className="mt-2 space-y-1 text-xs text-orange-200">
                    {regressionCheck.checks.filter(c => !c.passed).map((c, i) => (
                      <li key={i}>• {c.name}: {c.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">{t('boxmaker.export')}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={exportAllZip}
                    disabled={!validation.isValid}
                    className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('boxmaker.export_zip_all')}
                  </button>
                  <button
                    type="button"
                    onClick={exportAllPanels}
                    disabled={!validation.isValid}
                    className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('boxmaker.export_all_individual')}
                  </button>
                </div>
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
                  {t('boxmaker.2d_panels')}
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
                  {t('boxmaker.layout')}
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
                  {t('boxmaker.3d')}
                </button>
              </div>
              {previewMode === '3d' ? <div className="text-[11px] text-slate-400">{t('boxmaker.sliding_3d_preview')}</div> : null}
            </div>

            {previewMode === '3d' ? (
              <SlidingDrawerBoxPreview3D input={input} panels={panels} />
            ) : previewMode === 'faces' ? (
              <SlidingDrawerPanelPreview key="layout" layoutSvg={layoutSvg} panels={panels} initialView="layout" artworkOverlays={artworkOverlays} />
            ) : (
              <SlidingDrawerPreview svgs={svgs} dims={dims} />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

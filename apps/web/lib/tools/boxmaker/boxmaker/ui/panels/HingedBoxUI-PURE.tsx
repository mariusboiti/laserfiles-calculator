'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { BoxSettings, GeneratedFace, PathOperation } from '../../../src/lib/types';
import { applySimpleDefaults } from '../../../src/lib/defaults';
import { BoxPreview3D } from '../../../src/components/BoxPreview3D';
import { exportSingleSvg } from '../../export/exportSvgs';
import { DEFAULTS } from '../../config/defaults';
import { validateSimpleBoxInputs } from '../../core/validation';
import { generateSimpleBoxGeometry } from '../../core/simple/generateSimpleBox';
import { importSvgAsFace } from '../../../src/lib/svgImport';
import { mergeSvgWithOverlays, type EngraveOverlayItem } from '../../core/shared/mergeSvgWithOverlays';
import { FONTS as SHARED_FONTS, loadFont, textToPathD, type FontId } from '@/lib/fonts/sharedFontRegistry';
import { AIWarningBanner } from '@/components/ai';
import { Trash2 } from 'lucide-react';

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

function clampNumber(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function parseLengthNum(value: string | null): number | null {
  if (!value) return null;
  const m = String(value).trim().match(/^([+-]?[0-9]*\.?[0-9]+)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function prepareSvgForPreview(svg: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, 'image/svg+xml');
    const svgEl = doc.querySelector('svg');
    if (!svgEl) return svg;

    if (!svgEl.getAttribute('preserveAspectRatio')) {
      svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    }

    const viewBox = svgEl.getAttribute('viewBox');
    if (!viewBox) {
      const w = parseLengthNum(svgEl.getAttribute('width'));
      const h = parseLengthNum(svgEl.getAttribute('height'));
      if (Number.isFinite(w) && Number.isFinite(h) && w && h) {
        svgEl.setAttribute('viewBox', `0 0 ${w} ${h}`);
      }
    }

    return new XMLSerializer().serializeToString(svgEl);
  } catch {
    return svg;
  }
}

function faceToSvg(face: GeneratedFace): string {
  if (!face.paths || face.paths.length === 0) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"></svg>';
  }
  
  // Parse bounding box from path data
  const allCoords: { x: number; y: number }[] = [];
  let currentX = 0;
  let currentY = 0;
  
  face.paths.forEach(p => {
    // Parse M (move), L (line), H (horizontal), V (vertical) commands
    const commands = p.d.match(/[MLHVZ][^MLHVZ]*/gi) || [];
    
    commands.forEach(cmd => {
      const type = cmd[0].toUpperCase();
      const values = cmd.slice(1).trim().split(/[\s,]+/).map(v => parseFloat(v)).filter(v => !isNaN(v));
      
      if (type === 'M' || type === 'L') {
        if (values.length >= 2) {
          currentX = values[0];
          currentY = values[1];
          allCoords.push({ x: currentX, y: currentY });
        }
      } else if (type === 'H') {
        if (values.length >= 1) {
          currentX = values[0];
          allCoords.push({ x: currentX, y: currentY });
        }
      } else if (type === 'V') {
        if (values.length >= 1) {
          currentY = values[0];
          allCoords.push({ x: currentX, y: currentY });
        }
      }
    });
  });
  
  if (allCoords.length === 0) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"></svg>';
  }
  
  const xs = allCoords.map(c => c.x);
  const ys = allCoords.map(c => c.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  const width = maxX - minX || 1;
  const height = maxY - minY || 1;
  const margin = 2;

  const pathsData = face.paths
    .map((p) => `<path d="${p.d}" fill="none" stroke="black" stroke-width="0.2"/>`)
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX - margin} ${minY - margin} ${width + margin * 2} ${height + margin * 2}" width="${width + margin * 2}mm" height="${height + margin * 2}mm">
${pathsData}
</svg>`;
}

function parsePathToPoints(d: string): { points: Array<{ x: number; y: number }>; closed: boolean } {
  const commands = d.match(/[MLHVZ][^MLHVZ]*/gi) || [];
  const points: Array<{ x: number; y: number }> = [];
  let x = 0;
  let y = 0;
  let closed = false;

  for (const cmd of commands) {
    const type = cmd[0].toUpperCase();
    const values = cmd
      .slice(1)
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v));

    if (type === 'M' || type === 'L') {
      if (values.length >= 2) {
        x = values[0];
        y = values[1];
        points.push({ x, y });
      }
    } else if (type === 'H') {
      if (values.length >= 1) {
        x = values[0];
        points.push({ x, y });
      }
    } else if (type === 'V') {
      if (values.length >= 1) {
        y = values[0];
        points.push({ x, y });
      }
    } else if (type === 'Z') {
      closed = true;
    }
  }

  return { points, closed };
}

function pointsToPath(points: Array<{ x: number; y: number }>, closed: boolean): string {
  if (points.length === 0) return '';
  const parts: string[] = [`M ${points[0].x.toFixed(3)} ${points[0].y.toFixed(3)}`];
  for (let i = 1; i < points.length; i++) {
    parts.push(`L ${points[i].x.toFixed(3)} ${points[i].y.toFixed(3)}`);
  }
  if (closed) parts.push('Z');
  return parts.join(' ');
}

function applyTopCenteredNotch(
  d: string,
  notchWidth: number,
  notchDepth: number
): string {
  const { points, closed } = parsePathToPoints(d);
  if (points.length < 2) return d;

  const eps = 0.001;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const centerX = (minX + maxX) / 2;
  const notchLeft = centerX - notchWidth / 2;
  const notchRight = centerX + notchWidth / 2;

  const pts = closed ? [...points, points[0]] : [...points];
  let segIndex = -1;
  let yTop = Number.POSITIVE_INFINITY;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const isHorizontal = Math.abs(a.y - b.y) < eps;
    if (!isHorizontal) continue;

    const segMinX = Math.min(a.x, b.x);
    const segMaxX = Math.max(a.x, b.x);
    if (notchLeft >= segMinX - eps && notchRight <= segMaxX + eps) {
      if (a.y < yTop) {
        yTop = a.y;
        segIndex = i;
      }
    }
  }

  if (segIndex === -1) return d;

  const centroidY = ys.reduce((acc, v) => acc + v, 0) / Math.max(ys.length, 1);
  const dirY = centroidY > yTop ? 1 : -1;
  const yDown = yTop + dirY * notchDepth;

  const pushUnique = (arr: Array<{ x: number; y: number }>, p: { x: number; y: number }) => {
    if (arr.length === 0) {
      arr.push(p);
      return;
    }
    const last = arr[arr.length - 1];
    if (Math.abs(last.x - p.x) > eps || Math.abs(last.y - p.y) > eps) {
      arr.push(p);
    }
  };

  const newPts: Array<{ x: number; y: number }> = [];
  pushUnique(newPts, points[0]);

  const n = points.length;
  for (let i = 0; i < n; i++) {
    const curr = points[i];
    const next = points[(i + 1) % n];
    if (!closed && i === n - 1) break;

    if (i === segIndex) {
      const dir = next.x >= curr.x ? 1 : -1;
      const enterX = dir === 1 ? notchLeft : notchRight;
      const exitX = dir === 1 ? notchRight : notchLeft;

      // Walk along the top edge to the notch
      pushUnique(newPts, { x: enterX, y: yTop });
      // Down, across, up
      pushUnique(newPts, { x: enterX, y: yDown });
      pushUnique(newPts, { x: exitX, y: yDown });
      pushUnique(newPts, { x: exitX, y: yTop });
      // Continue along the same top edge segment to the original next point
      pushUnique(newPts, { x: next.x, y: next.y });
    } else {
      pushUnique(newPts, { x: next.x, y: next.y });
    }
  }

  // For closed paths, remove duplicated last==first if any; Z will close.
  if (closed && newPts.length > 1) {
    const first = newPts[0];
    const last = newPts[newPts.length - 1];
    if (Math.abs(first.x - last.x) < eps && Math.abs(first.y - last.y) < eps) {
      newPts.pop();
    }
  }

  return pointsToPath(newPts, closed);
}

interface HingedBoxUIProps {
  boxTypeSelector: ReactNode;
  unitSystem: 'mm' | 'in';
  onResetCallback?: (callback: () => void) => void;
}

const MM_PER_INCH = 25.4;

const HINGED_DEFAULT_WIDTH_MM = 156;
const HINGED_DEFAULT_DEPTH_MM = 156;
const HINGED_DEFAULT_HEIGHT_MM = 30;
const HINGED_DEFAULT_FINGER_WIDTH_MM = 3.54;

export function HingedBoxUI({ boxTypeSelector, unitSystem, onResetCallback }: HingedBoxUIProps) {
  const MM_PER_INCH = 25.4;
  const unitLabel = unitSystem;
  const toUser = (mm: number) => (unitSystem === 'in' ? mm / MM_PER_INCH : mm);
  const fromUser = (val: number) => (unitSystem === 'in' ? val * MM_PER_INCH : val);

  const [previewMode, setPreviewMode] = useState<'2d' | '3d'>('2d');
  const [previewZoom, setPreviewZoom] = useState(140);

  // Same defaults as Simple Box
  const [widthMm, setWidthMm] = useState(HINGED_DEFAULT_WIDTH_MM);
  const [depthMm, setDepthMm] = useState(HINGED_DEFAULT_DEPTH_MM);
  const [heightMm, setHeightMm] = useState(HINGED_DEFAULT_HEIGHT_MM);
  // ... (rest of the code remains the same)
  const [thicknessMm, setThicknessMm] = useState(DEFAULTS.common.thicknessMm);
  const [kerfMm, setKerfMm] = useState(DEFAULTS.common.kerfMm);
  const [fingerWidthMm, setFingerWidthMm] = useState(HINGED_DEFAULT_FINGER_WIDTH_MM);
  const [fingerWidthText, setFingerWidthText] = useState<string>(() => {
    const v = unitSystem === 'mm' ? HINGED_DEFAULT_FINGER_WIDTH_MM : HINGED_DEFAULT_FINGER_WIDTH_MM / MM_PER_INCH;
    const digits = unitSystem === 'mm' ? 2 : 3;
    return String(Number(v.toFixed(digits)));
  });
  const [isEditingFingerWidth, setIsEditingFingerWidth] = useState(false);

  // Hinge settings
  const hingePinDiameter = thicknessMm + 1.5;
  const [hingePinInsetFromTop, setHingePinInsetFromTop] = useState(0);
  const [hingePinInsetFromBack, setHingePinInsetFromBack] = useState(4);
  
  // View mode
  const [viewMode, setViewMode] = useState<'all' | string>('all');

  const [faceArtworkTargets, setFaceArtworkTargets] = useState<string[]>(['front']);
  const [faceArtworkPrompt, setFaceArtworkPrompt] = useState<string>('');
  const [faceArtworkModel, setFaceArtworkModel] = useState<'silhouette' | 'sketch' | 'geometric'>('silhouette');
  const [faceArtworkByFace, setFaceArtworkByFace] = useState<Record<string, FaceArtworkConfig | undefined>>({});
  const [selectedArtworkFace, setSelectedArtworkFace] = useState<string>('front');
  const [isArtworkGenerating, setIsArtworkGenerating] = useState(false);
  const [artworkError, setArtworkError] = useState<string | null>(null);

  const [engraveOp, setEngraveOp] = useState<PathOperation>('engrave');
  const [engraveTarget, setEngraveTarget] = useState<string>('front');
  const [engraveItems, setEngraveItems] = useState<EngraveOverlayItem[]>([]);
  const [selectedEngraveId, setSelectedEngraveId] = useState<string | null>(null);

  const [engraveText, setEngraveText] = useState('');
  const [engraveTextFontId, setEngraveTextFontId] = useState<FontId>(() => (SHARED_FONTS[0]?.id ?? 'Milkshake'));
  const [engraveTextSizeMm, setEngraveTextSizeMm] = useState(10);
  const [engraveTextLetterSpacingMm, setEngraveTextLetterSpacingMm] = useState(0);
  const [engraveTextCurved, setEngraveTextCurved] = useState(false);
  const [engraveTextCurveRadius, setEngraveTextCurveRadius] = useState(30);
  const [textPreviewSvg, setTextPreviewSvg] = useState<string | null>(null);

  // Reset function
  useEffect(() => {
    if (onResetCallback) {
      onResetCallback(() => {
        setWidthMm(HINGED_DEFAULT_WIDTH_MM);
        setDepthMm(HINGED_DEFAULT_DEPTH_MM);
        setHeightMm(HINGED_DEFAULT_HEIGHT_MM);
        setThicknessMm(DEFAULTS.common.thicknessMm);
        setKerfMm(DEFAULTS.common.kerfMm);
        setFingerWidthMm(HINGED_DEFAULT_FINGER_WIDTH_MM);
        {
          const v = unitSystem === 'mm' ? HINGED_DEFAULT_FINGER_WIDTH_MM : HINGED_DEFAULT_FINGER_WIDTH_MM / MM_PER_INCH;
          const digits = unitSystem === 'mm' ? 2 : 3;
          setFingerWidthText(String(Number(v.toFixed(digits))));
        }
        setHingePinInsetFromTop(0);
        setHingePinInsetFromBack(4);
        setFaceArtworkTargets(['front']);
        setFaceArtworkPrompt('');
        setFaceArtworkModel('silhouette');
        setFaceArtworkByFace({});
        setSelectedArtworkFace('front');
        setIsArtworkGenerating(false);
        setArtworkError(null);
        setEngraveOp('engrave');
        setEngraveItems([]);
        setSelectedEngraveId(null);
        setEngraveTarget('front');
      });
    }
  }, [onResetCallback, unitSystem]);

  useEffect(() => {
    if (isEditingFingerWidth) return;
    const v = toUser(fingerWidthMm);
    const digits = unitSystem === 'mm' ? 2 : 3;
    setFingerWidthText(String(Number(v.toFixed(digits))));
  }, [fingerWidthMm, isEditingFingerWidth, unitSystem]);

  const commitFingerWidth = (raw: string) => {
    const trimmed = raw.trim();
    const n = Number(trimmed);
    if (!Number.isFinite(n)) {
      const v = toUser(fingerWidthMm);
      const digits = unitSystem === 'mm' ? 2 : 3;
      setFingerWidthText(String(Number(v.toFixed(digits))));
      return;
    }

    const mm = clampNumber(fromUser(n), 2, 200);
    setFingerWidthMm(mm);

    const v = toUser(mm);
    const digits = unitSystem === 'mm' ? 2 : 3;
    setFingerWidthText(String(Number(v.toFixed(digits))));
  };

  // Generate panels using SAME generator as Simple Box
  const { faces, facesFor3d, settings, validation, hingeHoles } = useMemo(() => {
    const input = {
      widthMm: clampNumber(widthMm, 10, 5000),
      depthMm: clampNumber(depthMm, 10, 5000),
      heightMm: clampNumber(heightMm, 10, 5000),
      thicknessMm: clampNumber(thicknessMm, 1, 50),
      kerfMm: clampNumber(kerfMm, 0, 1),
      fingerWidthMm: clampNumber(fingerWidthMm, 2, 200),
    };

    const validation = validateSimpleBoxInputs(input);

    const rawSettings: BoxSettings = {
      width: input.widthMm,
      depth: input.depthMm,
      height: input.heightMm,
      dimensionReference: 'inside',

      materialThickness: input.thicknessMm,
      kerf: input.kerfMm,
      applyKerfCompensation: true,

      boxType: 'finger_all_edges',

      fingerMin: input.fingerWidthMm,
      fingerMax: input.fingerWidthMm,
      autoFingerCount: true,
      manualFingerCount: null,

      lidType: 'flat_lid', // Always include lid for hinged box
      grooveDepth: input.thicknessMm,
      grooveOffset: input.thicknessMm,
      lipInset: 2,
      lipHeight: 8,

      dividersEnabled: false,
      dividerCountX: 1,
      dividerCountZ: 1,
      dividerClearance: 0.2,

      arrangeOnSheet: false,
      sheetWidth: 300,
      sheetHeight: 200,
      partSpacing: 3,
      autoRotateParts: false,
    };

    const settings = applySimpleDefaults(rawSettings, { preserveDimensionReference: true });
    const out = generateSimpleBoxGeometry(settings);

    const lidW = 148;
    const lidH = 147.8;
    const lidTabW = 4;
    const lidTabH = 3.32;
    const lidTabInsetFromTop = 1.64;
    const lidBottomTabW = 32.31;
    const lidBottomTabH = 8;
    const y1 = lidTabInsetFromTop;
    const y2 = lidTabInsetFromTop + lidTabH;
    const lidBottomTabLeft = lidW / 2 - lidBottomTabW / 2;
    const lidBottomTabRight = lidW / 2 + lidBottomTabW / 2;
    const lidBottomY = lidH;
    const lidBottomTabY = lidH + lidBottomTabH;
    // Outline includes 2 side tabs protruding outward
    const lidBottomCornerR = Math.min(2, lidBottomTabH, lidBottomTabW / 2);
    const arcPoints = (
      cx: number,
      cy: number,
      r: number,
      startDeg: number,
      endDeg: number,
      steps: number
    ) => {
      const pts: Array<{ x: number; y: number }> = [];
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const deg = startDeg + (endDeg - startDeg) * t;
        const rad = (deg * Math.PI) / 180;
        pts.push({ x: cx + Math.cos(rad) * r, y: cy + Math.sin(rad) * r });
      }
      return pts;
    };

    const lidVertices: Array<{ x: number; y: number }> = [
      { x: 0, y: 0 },
      { x: lidW, y: 0 },
      { x: lidW, y: y1 },
      { x: lidW + lidTabW, y: y1 },
      { x: lidW + lidTabW, y: y2 },
      { x: lidW, y: y2 },
      { x: lidW, y: lidBottomY },
      { x: lidBottomTabRight, y: lidBottomY },
    ];

    if (lidBottomCornerR > 0) {
      const r = lidBottomCornerR;
      lidVertices.push({ x: lidBottomTabRight, y: lidBottomTabY - r });
      lidVertices.push(
        ...arcPoints(lidBottomTabRight - r, lidBottomTabY - r, r, 0, 90, 5),
        { x: lidBottomTabLeft + r, y: lidBottomTabY },
        ...arcPoints(lidBottomTabLeft + r, lidBottomTabY - r, r, 90, 180, 5),
        { x: lidBottomTabLeft, y: lidBottomY }
      );
    } else {
      lidVertices.push(
        { x: lidBottomTabRight, y: lidBottomTabY },
        { x: lidBottomTabLeft, y: lidBottomTabY },
        { x: lidBottomTabLeft, y: lidBottomY }
      );
    }

    lidVertices.push(
      { x: 0, y: lidBottomY },
      { x: 0, y: y2 },
      { x: -lidTabW, y: y2 },
      { x: -lidTabW, y: y1 },
      { x: 0, y: y1 }
    );

    const lidOutlineD = pointsToPath(lidVertices, true);
    const shrinkBottomFace = (face: GeneratedFace): GeneratedFace => {
      const t = input.thicknessMm;
      const desiredW = input.widthMm;
      const desiredH = input.depthMm;

      const oldFaceW = face.width;
      const oldFaceH = face.height;
      const innerW = Math.max(oldFaceW - 2 * t, 1);
      const innerH = Math.max(oldFaceH - 2 * t, 1);
      const newInnerW = Math.max(desiredW - 2 * t, 1);
      const newInnerH = Math.max(desiredH - 2 * t, 1);

      const x0 = t;
      const y0 = t;
      const innerEndX = x0 + innerW;
      const innerEndY = y0 + innerH;
      const newInnerEndX = x0 + newInnerW;
      const newInnerEndY = y0 + newInnerH;

      const eps = 1e-6;

      const mapX = (x: number) => {
        if (x <= x0 + eps) return x;
        if (x <= innerEndX + eps) return x0 + ((x - x0) * newInnerW) / innerW;
        return newInnerEndX + (x - innerEndX);
      };
      const mapY = (y: number) => {
        if (y <= y0 + eps) return y;
        if (y <= innerEndY + eps) return y0 + ((y - y0) * newInnerH) / innerH;
        return newInnerEndY + (y - innerEndY);
      };

      const vertices = (face.vertices ?? []).map((p) => ({ x: mapX(p.x), y: mapY(p.y) }));
      const outlinePath = pointsToPath(vertices, true);
      return {
        ...face,
        width: desiredW,
        height: desiredH,
        outlinePath,
        vertices,
        paths: [{ d: outlinePath, op: 'cut' as const }],
      };
    };

    const shrinkFaceTotalWidth = (face: GeneratedFace, desiredW: number): GeneratedFace => {
      const t = input.thicknessMm;
      const oldFaceW = face.width;
      const innerW = Math.max(oldFaceW - 2 * t, 1);
      const newInnerW = Math.max(desiredW - 2 * t, 1);

      const x0 = t;
      const innerEndX = x0 + innerW;
      const newInnerEndX = x0 + newInnerW;

      const eps = 1e-6;
      const mapX = (x: number) => {
        if (x <= x0 + eps) return x;
        if (x <= innerEndX + eps) return x0 + ((x - x0) * newInnerW) / innerW;
        return newInnerEndX + (x - innerEndX);
      };

      const vertices = (face.vertices ?? []).map((p) => ({ x: mapX(p.x), y: p.y }));
      const outlinePath = pointsToPath(vertices, true);
      return {
        ...face,
        width: desiredW,
        outlinePath,
        vertices,
        paths: [{ d: outlinePath, op: 'cut' as const }],
      };
    };

    const facesRaw: GeneratedFace[] = out.faces.map((f): GeneratedFace => {
      if (f.name === 'lid') {
        return {
          ...f,
          width: lidW + 2 * lidTabW,
          height: lidH + lidBottomTabH,
          outlinePath: lidOutlineD,
          vertices: lidVertices,
          paths: [{ d: lidOutlineD, op: 'cut' as const }],
        };
      }
      if (f.name === 'bottom') {
        return shrinkBottomFace(f);
      }
      if (f.name === 'front' || f.name === 'back') {
        return shrinkFaceTotalWidth(f, input.widthMm);
      }
      if (f.name === 'left' || f.name === 'right') {
        return shrinkFaceTotalWidth(f, input.depthMm);
      }
      return f;
    });

    const faces: GeneratedFace[] = facesRaw.filter((f) => f.name !== 'lid_inner');

    // Calculate hinge holes for left and right panels
    const hingeHoles: { left: { cx: number; cy: number; r: number } | null; right: { cx: number; cy: number; r: number } | null } = {
      left: null,
      right: null
    };

    {
      const holeDiameter = input.thicknessMm + 1.5;
      const r = holeDiameter / 2;
      const minInset = r;

      // Align to lid side tab ("tooth") center, plus optional extra offsets.
      const lidToothCenterOffset = lidTabInsetFromTop + lidTabH / 2;
      const offsetTop = lidToothCenterOffset + hingePinInsetFromTop;
      const offsetRight = lidToothCenterOffset + hingePinInsetFromBack;

      const refFace = faces.find((f) => f.name === 'right') ?? faces.find((f) => f.name === 'left') ?? null;
      const xs = (refFace?.vertices ?? []).map((p) => p.x);
      const ys = (refFace?.vertices ?? []).map((p) => p.y);
      const minX = xs.length ? Math.min(...xs) : 0;
      const maxX = xs.length ? Math.max(...xs) : input.depthMm;
      const minY = ys.length ? Math.min(...ys) : 0;
      const maxY = ys.length ? Math.max(...ys) : input.heightMm;

      const cyDesired = maxY - offsetTop;
      const cy = Math.max(minY + minInset, Math.min(maxY - minInset, cyDesired));

      const cxDesiredRight = maxX - offsetRight;
      const cxDesiredLeft = minX + offsetRight;
      const cxRight = Math.max(minX + minInset, Math.min(maxX - minInset, cxDesiredRight));
      const cxLeft = Math.max(minX + minInset, Math.min(maxX - minInset, cxDesiredLeft));

      // LEFT hole
      hingeHoles.left = { cx: cxLeft, cy, r };

      // RIGHT hole
      hingeHoles.right = { cx: cxRight, cy, r };
    }

    // Build facesFor3d by cloning and applying the same modifications as 2D (notch + hinge holes)
    const facesFor3d: GeneratedFace[] = faces.map((f) => ({
      ...f,
      paths: f.paths ? f.paths.map((p) => ({ ...p })) : [],
    }));

    const findFace = (name: string) => facesFor3d.find((x) => x.name === name) ?? null;

    // Apply notch to FRONT outline path (integrated)
    const frontFace = findFace('front');
    if (frontFace && frontFace.paths && frontFace.paths.length > 0) {
      const first = frontFace.paths[0];
      const nextD = applyTopCenteredNotch(first.d, 34, input.thicknessMm + 2);
      const parsed = parsePathToPoints(nextD);
      frontFace.paths[0] = {
        ...first,
        d: nextD,
        op: 'cut' as const,
      };
      if (parsed.points.length >= 3) {
        frontFace.outlinePath = nextD;
        frontFace.vertices = parsed.points;
      }
    }

    const circlePath = (cx: number, cy: number, r: number) => {
      const x1 = (cx + r).toFixed(3);
      const y1 = cy.toFixed(3);
      const x2 = (cx - r).toFixed(3);
      const y2 = cy.toFixed(3);
      const rr = r.toFixed(3);
      return `M ${x1} ${y1} A ${rr} ${rr} 0 1 0 ${x2} ${y2} A ${rr} ${rr} 0 1 0 ${x1} ${y1} Z`;
    };

    // Apply hinge holes as cut paths on LEFT/RIGHT
    {
      const leftFace = findFace('left');
      const rightFace = findFace('right');
      if (leftFace && hingeHoles.left) {
        leftFace.paths.push({ d: circlePath(hingeHoles.left.cx, hingeHoles.left.cy, hingeHoles.left.r), op: 'cut' as const });
      }
      if (rightFace && hingeHoles.right) {
        rightFace.paths.push({ d: circlePath(hingeHoles.right.cx, hingeHoles.right.cy, hingeHoles.right.r), op: 'cut' as const });
      }
    }

    return { faces, facesFor3d, settings, validation, hingeHoles };
  }, [depthMm, fingerWidthMm, heightMm, kerfMm, thicknessMm, widthMm, hingePinInsetFromTop, hingePinInsetFromBack]);

  const settingsFor3d = useMemo(() => {
    const t = thicknessMm;
    const adjustedWidth = Math.max(widthMm - 2 * t, 1);
    const adjustedDepth = Math.max(depthMm - 2 * t, 1);
    return {
      ...settings,
      width: adjustedWidth,
      depth: adjustedDepth,
    };
  }, [depthMm, settings, thicknessMm, widthMm]);

  // Generate SVGs with hinge holes and custom notch added
  const faceSvgs = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of faces) {
      let svg = prepareSvgForPreview(faceToSvg(f));
      
      // Add custom female notch to FRONT panel (34mm wide, centered on top edge)
      if (f.name === 'front') {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svg, 'image/svg+xml');
        const svgEl = doc.querySelector('svg');
        
        if (svgEl) {
          const pathEl = svgEl.querySelector('path');
          if (pathEl) {
            const d = pathEl.getAttribute('d') || '';
            const nextD = applyTopCenteredNotch(d, 34, thicknessMm + 2);
            pathEl.setAttribute('d', nextD);
            svg = new XMLSerializer().serializeToString(svgEl);
          }
        }
      }
      
      // Add hinge holes to left and right panels
      if (f.name === 'left' && hingeHoles.left) {
        svg = svg.replace('</svg>', `<circle cx="${hingeHoles.left.cx.toFixed(3)}" cy="${hingeHoles.left.cy.toFixed(3)}" r="${hingeHoles.left.r.toFixed(3)}" fill="none" stroke="red" stroke-width="0.2"/></svg>`);
      }
      if (f.name === 'right' && hingeHoles.right) {
        svg = svg.replace('</svg>', `<circle cx="${hingeHoles.right.cx.toFixed(3)}" cy="${hingeHoles.right.cy.toFixed(3)}" r="${hingeHoles.right.r.toFixed(3)}" fill="none" stroke="red" stroke-width="0.2"/></svg>`);
      }

      const items = engraveItems.filter((it) => String(it.id).startsWith(`${f.name}:`));
      svg = mergeSvgWithOverlays(svg, items);
      
      map.set(f.name, svg);
    }
    return map;
  }, [faces, hingeHoles, thicknessMm, engraveItems]);

  const faceKeys = useMemo(() => {
    const order = ['front', 'back', 'left', 'right', 'bottom', 'top', 'lid'];
    const keys = faces.map((f) => f.name).filter((k) => k !== 'lid_inner');
    const uniq = Array.from(new Set(keys));
    uniq.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    return uniq;
  }, [faces]);

  const faceByName = useMemo(() => {
    const m = new Map<string, GeneratedFace>();
    faces.forEach((f) => m.set(String(f.name), f));
    return m;
  }, [faces]);

  useEffect(() => {
    if (!faceKeys.length) return;
    if (faceKeys.includes(selectedArtworkFace as any)) return;
    setSelectedArtworkFace(faceKeys[0]);
  }, [faceKeys, selectedArtworkFace]);

  const selectedArtwork = selectedArtworkFace ? faceArtworkByFace[selectedArtworkFace] ?? null : null;

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
      setArtworkError('Please enter a prompt');
      return;
    }

    const targets = faceArtworkTargets.filter((t) => faceKeys.includes(t as any));
    if (targets.length === 0) {
      setArtworkError('Select at least one face');
      return;
    }

    setIsArtworkGenerating(true);
    setArtworkError(null);

    try {
      // Enhance prompt based on selected model - always request white background
      let enhancedPrompt = prompt;
      if (faceArtworkModel === 'sketch') {
        enhancedPrompt = `pencil sketch drawing style, hand-drawn, artistic sketch on white background: ${prompt}, white background`;
      } else if (faceArtworkModel === 'geometric') {
        enhancedPrompt = `geometric pattern, repeating geometric shapes, symmetrical design on white background: ${prompt}, white background`;
      } else {
        enhancedPrompt = `${prompt}, white background`;
      }

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

      setFaceArtworkByFace((prev) => {
        const next = { ...prev };
        for (const faceName of targets) {
          const face = faceByName.get(faceName);
          const w = Math.max(face?.width ?? 1, 1);
          const h = Math.max(face?.height ?? 1, 1);
          const existing = next[faceName];
          next[faceName] = {
            prompt,
            imageDataUrl: dataUrl,
            placement: existing?.placement ?? { x: w / 2, y: h / 2, scale: 0.5, rotationDeg: 0 },
          };
        }
        return next;
      });

      if (!targets.includes(selectedArtworkFace)) {
        setSelectedArtworkFace(targets[0]);
      }
    } catch (e) {
      setArtworkError(e instanceof Error ? e.message : 'AI generation failed');
    } finally {
      setIsArtworkGenerating(false);
    }
  };

  const handleTraceSelectedArtwork = async () => {
    const faceName = String(selectedArtworkFace || '').trim();
    const art = faceName ? faceArtworkByFace[faceName] : null;
    const face = faceName ? faceByName.get(faceName) ?? null : null;

    if (!faceName || !art?.imageDataUrl || !face) {
      setArtworkError('Select a face with artwork to trace');
      return;
    }

    setIsArtworkGenerating(true);
    setArtworkError(null);

    try {
      const mode = faceArtworkModel === 'silhouette' ? 'CUT_SILHOUETTE' : 'ENGRAVE_LINEART';

      const res = await fetch('/api/trace/potrace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataUrl: art.imageDataUrl,
          mode,
          targetWidthMm: face.width,
          targetHeightMm: face.height,
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

      const op: PathOperation = mode === 'CUT_SILHOUETTE' ? 'cut' : 'score';
      const importedFace = importSvgAsFace({
        svgText,
        id: `trace-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        op,
        label: `trace-${faceName}`,
      });

      if (!importedFace) {
        throw new Error('Trace result could not be imported as SVG');
      }

      const id = `${faceName}:${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setEngraveItems((prev) => [
        ...prev,
        {
          id,
          fileName: `trace-${faceName}.svg`,
          op,
          face: importedFace,
          placement: {
            x: art.placement.x,
            y: art.placement.y,
            rotation: ((art.placement.rotationDeg ?? 0) * Math.PI) / 180,
            scale: Math.max(0.01, art.placement.scale ?? 1),
          },
        },
      ]);
      setSelectedEngraveId(id);
      setEngraveTarget(faceName);
    } catch (e) {
      setArtworkError(e instanceof Error ? e.message : 'Trace failed');
    } finally {
      setIsArtworkGenerating(false);
    }
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

    const face = faceByName.get(engraveTarget) ?? faces[0] ?? null;
    if (!face) return;

    const font = await loadFont(engraveTextFontId);
    const res = textToPathD(font, text, Math.max(0.1, engraveTextSizeMm), Math.max(0, engraveTextLetterSpacingMm));
    if (!res?.pathD) return;

    const svgText = `<svg xmlns="http://www.w3.org/2000/svg"><path d="${res.pathD}" /></svg>`;

    const importedFace = importSvgAsFace({
      svgText,
      id: `text-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      op: engraveOp,
      label: `text-${text}`,
    });
    if (!importedFace) return;

    const id = `${engraveTarget}:${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setEngraveItems((prev) => [
      ...prev,
      {
        id,
        fileName: `text-${text}.svg`,
        op: engraveOp,
        face: importedFace,
        placement: { x: face.width / 2, y: face.height / 2, rotation: 0, scale: 1 },
      },
    ]);
    setSelectedEngraveId(id);
  };

  const selectedFace = useMemo(() => {
    if (viewMode === 'all') return null;
    return faces.find((f) => f.name === viewMode) ?? null;
  }, [faces, viewMode]);

  const selectedFaceDimsLabel = useMemo(() => {
    if (!selectedFace) return '';
    const w = toUser(selectedFace.width);
    const h = toUser(selectedFace.height);
    const digits = unitSystem === 'mm' ? 2 : 3;
    return `${w.toFixed(digits)} × ${h.toFixed(digits)} ${unitLabel}`;
  }, [selectedFace, toUser, unitLabel, unitSystem]);

  const selectedEngraveItem = useMemo(() => {
    return selectedEngraveId ? engraveItems.find((x) => x.id === selectedEngraveId) ?? null : null;
  }, [engraveItems, selectedEngraveId]);

  const setSelectedEngravePlacement = (patch: Partial<EngraveOverlayItem['placement']>) => {
    if (!selectedEngraveId) return;
    setEngraveItems((prev) =>
      prev.map((it) => (it.id === selectedEngraveId ? { ...it, placement: { ...it.placement, ...patch } } : it)),
    );
  };

  const handleExportAll = () => {
    // Export all faces into a single SVG laid out in 2 columns.
    const margin = 10;
    const columns = 2;

    type FaceLayout = {
      name: string;
      col: number;
      x: number;
      y: number;
      w: number;
      h: number;
      vbMinX: number;
      vbMinY: number;
      inner: string;
    };

    const parsed: Array<{ name: string; vb: [number, number, number, number]; inner: string }> = [];

    for (const name of faceKeys) {
      const svg = faceSvgs.get(name) || '';
      if (!svg) continue;
      const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
      const svgEl = doc.querySelector('svg');
      if (!svgEl) continue;

      const vbRaw = svgEl.getAttribute('viewBox')?.trim() || '0 0 100 100';
      const vbParts = vbRaw
        .split(/[\s,]+/)
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n));
      const vb: [number, number, number, number] =
        vbParts.length === 4 ? [vbParts[0], vbParts[1], vbParts[2], vbParts[3]] : [0, 0, 100, 100];

      parsed.push({ name, vb, inner: svgEl.innerHTML });
    }

    if (parsed.length === 0) return;

    // Column widths are based on max panel width per column in the given order (index%2).
    const colMaxW = new Array(columns).fill(0);
    for (let i = 0; i < parsed.length; i += 1) {
      const col = i % columns;
      const [, , w] = parsed[i].vb;
      colMaxW[col] = Math.max(colMaxW[col], Math.max(1, w));
    }

    const colX: number[] = [];
    let xCursor = 0;
    for (let c = 0; c < columns; c += 1) {
      colX[c] = xCursor;
      xCursor += colMaxW[c] + (c === columns - 1 ? 0 : margin);
    }

    const yCursor = new Array(columns).fill(0);
    const layouts: FaceLayout[] = [];

    for (let i = 0; i < parsed.length; i += 1) {
      const p = parsed[i];
      const col = i % columns;
      const [vbMinX, vbMinY, vbW, vbH] = p.vb;
      const w = Math.max(1, vbW);
      const h = Math.max(1, vbH);

      const x = colX[col];
      const y = yCursor[col];
      yCursor[col] += h + margin;

      layouts.push({ name: p.name, col, x, y, w, h, vbMinX, vbMinY, inner: p.inner });
    }

    const totalW = colX[columns - 1] + colMaxW[columns - 1];
    const totalH = Math.max(...yCursor.map((v) => (v > 0 ? v - margin : 0)));

    const combinedSvg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${totalH}" width="${totalW}mm" height="${totalH}mm">\n${layouts
      .map((l) => {
        // Translate inner content so its viewBox origin aligns at the placed panel origin.
        const tx = (l.x - l.vbMinX).toFixed(3);
        const ty = (l.y - l.vbMinY).toFixed(3);
        return `  <g transform="translate(${tx} ${ty})">\n    ${l.inner}\n  </g>`;
      })
      .join('\n')}\n</svg>`;

    const blob = new Blob([combinedSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'boxmaker-hinged-all-panels.svg';
    a.click();
    URL.revokeObjectURL(url);
  };

  const interiorWidthMm = Math.max(widthMm - 2 * thicknessMm, 0);
  const interiorDepthMm = Math.max(depthMm - 2 * thicknessMm, 0);

  return (
    <div className="grid grid-cols-[280px_1fr] gap-4 h-full">
      {/* Left Panel - Controls */}
      <div className="flex flex-col gap-4 overflow-y-auto p-4 bg-slate-900 rounded-lg">
        {boxTypeSelector}

        <div className="rounded-md border border-emerald-800 bg-emerald-950/30 px-3 py-2">
          <div className="text-[11px] font-medium text-emerald-300">Hinged Box (Side Pin)</div>
          <div className="mt-1 text-[10px] text-slate-400">
            Uses same generator as Simple Box + adds hinge holes
          </div>
        </div>

        <div className="rounded-md border border-slate-700 bg-slate-950/30 px-3 py-2">
          <div className="text-xs font-medium text-slate-200">Face Artwork</div>
          <div className="mt-1 text-[10px] text-slate-400">Preview-only overlay (not included in exports)</div>

          <div className="mt-2">
            <AIWarningBanner />
          </div>

          <div className="mt-2 grid gap-2">
            <label className="grid gap-1">
              <span className="text-[11px] text-slate-400">Model</span>
              <select
                value={faceArtworkModel}
                onChange={(e) => setFaceArtworkModel(e.target.value as 'silhouette' | 'sketch' | 'geometric')}
                className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
              >
                <option value="silhouette">Silhouette</option>
                <option value="sketch">Sketch</option>
                <option value="geometric">Geometric Pattern</option>
              </select>
            </label>

            <label className="grid gap-1">
              <span className="text-[11px] text-slate-400">Prompt</span>
              <input
                type="text"
                value={faceArtworkPrompt}
                onChange={(e) => setFaceArtworkPrompt(e.target.value)}
                placeholder="e.g. floral silhouette"
                className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
              />
            </label>

            <div className="grid gap-1">
              <span className="text-[11px] text-slate-400">Faces</span>
              <div className="flex flex-wrap gap-2">
                {faceKeys.map((k) => (
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
              <div className="rounded-md border border-amber-800 bg-amber-950/30 p-2 text-[11px] text-amber-200">{artworkError}</div>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1">
                <span className="text-[11px] text-slate-400">Edit face</span>
                <select
                  value={selectedArtworkFace}
                  onChange={(e) => setSelectedArtworkFace(e.target.value)}
                  className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
                >
                  {faceKeys.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </label>
              <div className="text-[10px] text-slate-500 self-end">Center-based X/Y in mm</div>
            </div>

            {selectedArtwork ? (
              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1">
                  <span className="text-[11px] text-slate-400">X (mm)</span>
                  <input
                    type="number"
                    value={Number(selectedArtwork.placement.x.toFixed(2))}
                    onChange={(e) => setSelectedArtworkPlacement({ x: Number(e.target.value) || 0 })}
                    className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-[11px] text-slate-400">Y (mm)</span>
                  <input
                    type="number"
                    value={Number(selectedArtwork.placement.y.toFixed(2))}
                    onChange={(e) => setSelectedArtworkPlacement({ y: Number(e.target.value) || 0 })}
                    className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-[11px] text-slate-400">Scale</span>
                  <input
                    type="number"
                    min={0.05}
                    step={0.05}
                    value={Number(selectedArtwork.placement.scale.toFixed(2))}
                    onChange={(e) =>
                      setSelectedArtworkPlacement({ scale: Math.max(0.05, Number(e.target.value) || 0.05) })
                    }
                    className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-[11px] text-slate-400">Rotate (deg)</span>
                  <input
                    type="number"
                    step={1}
                    value={Number(selectedArtwork.placement.rotationDeg.toFixed(0))}
                    onChange={(e) => setSelectedArtworkPlacement({ rotationDeg: Number(e.target.value) || 0 })}
                    className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
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
                className="rounded p-1 text-rose-400 hover:bg-slate-800 hover:text-rose-300"
                title="Delete layer"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                <span>X (mm)</span>
                <input
                  type="number"
                  step={0.1}
                  value={Number(selectedEngraveItem.placement.x.toFixed(2))}
                  onChange={(e) => setSelectedEngravePlacement({ x: Number(e.target.value) || 0 })}
                  className="w-24 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                />
              </label>
              <label className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                <span>Y (mm)</span>
                <input
                  type="number"
                  step={0.1}
                  value={Number(selectedEngraveItem.placement.y.toFixed(2))}
                  onChange={(e) => setSelectedEngravePlacement({ y: Number(e.target.value) || 0 })}
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
                  step={0.05}
                  min={0.05}
                  value={selectedEngraveItem.placement.scale}
                  onChange={(e) => setSelectedEngravePlacement({ scale: Math.max(0.05, Number(e.target.value) || 1) })}
                  className="w-24 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                />
              </label>
            </div>
          </div>
        ) : null}

        {/* Dimensions */}
        <fieldset className="grid gap-2 border border-slate-700 rounded-md p-3">
          <legend className="text-xs font-medium text-slate-300 px-1">Dimensions (Exterior)</legend>

          <div className="text-[10px] text-slate-500">
            Interior: {toUser(interiorWidthMm).toFixed(unitSystem === 'mm' ? 0 : 2)} × {toUser(interiorDepthMm).toFixed(unitSystem === 'mm' ? 0 : 2)} {unitLabel}
          </div>
          
          <label className="grid gap-1">
            <span className="text-[11px] text-slate-400">Width ({unitLabel})</span>
            <input
              type="number"
              step={unitSystem === 'mm' ? 1 : 0.1}
              value={toUser(widthMm).toFixed(unitSystem === 'mm' ? 0 : 2)}
              onChange={(e) => setWidthMm(fromUser(parseFloat(e.target.value) || 0))}
              className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
            />
          </label>
          
          <label className="grid gap-1">
            <span className="text-[11px] text-slate-400">Depth ({unitLabel})</span>
            <input
              type="number"
              step={unitSystem === 'mm' ? 1 : 0.1}
              value={toUser(depthMm).toFixed(unitSystem === 'mm' ? 0 : 2)}
              onChange={(e) => setDepthMm(fromUser(parseFloat(e.target.value) || 0))}
              className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
            />
          </label>
          
          <label className="grid gap-1">
            <span className="text-[11px] text-slate-400">Height ({unitLabel})</span>
            <input
              type="number"
              step={unitSystem === 'mm' ? 1 : 0.1}
              value={toUser(heightMm).toFixed(unitSystem === 'mm' ? 0 : 2)}
              onChange={(e) => setHeightMm(fromUser(parseFloat(e.target.value) || 0))}
              className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
            />
          </label>
        </fieldset>

        <div className="rounded-md border border-slate-700 bg-slate-950/30 px-3 py-2">
          <div className="text-xs font-medium text-slate-200">Engrave Overlay</div>
          <div className="mt-1 text-[10px] text-slate-400">Included in exports</div>

          <div className="mt-2 grid gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <label className="grid gap-1">
                <span className="text-[11px] text-slate-400">Operation</span>
                <select
                  value={engraveOp}
                  onChange={(e) => setEngraveOp(e.target.value as PathOperation)}
                  className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
                >
                  <option value="engrave">ENGRAVE</option>
                  <option value="score">SCORE</option>
                  <option value="cut">CUT</option>
                </select>
              </label>

              <label className="grid gap-1">
                <span className="text-[11px] text-slate-400">Target face</span>
                <select
                  value={engraveTarget}
                  onChange={(e) => setEngraveTarget(e.target.value)}
                  className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
                >
                  {faceKeys.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-2 rounded-md border border-slate-800 bg-slate-950/40 p-2">
              <div className="text-[11px] text-slate-400">Add text</div>
              <div className="grid gap-2">
                <input
                  type="text"
                  value={engraveText}
                  onChange={(e) => setEngraveText(e.target.value)}
                  placeholder="Text"
                  className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
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
                    <div className="text-[11px] text-slate-400">Font</div>
                    <select
                      value={engraveTextFontId}
                      onChange={(e) => setEngraveTextFontId(e.target.value as FontId)}
                      className="w-full rounded border border-slate-700 bg-slate-800 px-1 py-1 text-[10px]"
                    >
                      {SHARED_FONTS.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">Size</div>
                    <input
                      type="number"
                      min={0.1}
                      step={0.5}
                      value={engraveTextSizeMm}
                      onChange={(e) => setEngraveTextSizeMm(Number(e.target.value) || 0)}
                      className="w-full rounded border border-slate-700 bg-slate-800 px-1 py-1 text-[10px]"
                    />
                  </label>
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">Spacing</div>
                    <input
                      type="number"
                      step={0.1}
                      value={engraveTextLetterSpacingMm}
                      onChange={(e) => setEngraveTextLetterSpacingMm(Number(e.target.value) || 0)}
                      className="w-full rounded border border-slate-700 bg-slate-800 px-1 py-1 text-[10px]"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={handleAddEngraveText}
                  className="w-full rounded-md bg-slate-800 px-3 py-2 text-[11px] text-slate-100 hover:bg-slate-700"
                >
                  Add Text
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
                      title="Delete layer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* Material */}
        <fieldset className="grid gap-2 border border-slate-700 rounded-md p-3">
          <legend className="text-xs font-medium text-slate-300 px-1">Material</legend>
          
          <label className="grid gap-1">
            <span className="text-[11px] text-slate-400">Thickness ({unitLabel})</span>
            <input
              type="number"
              step={unitSystem === 'mm' ? 0.1 : 0.01}
              value={toUser(thicknessMm).toFixed(unitSystem === 'mm' ? 1 : 3)}
              onChange={(e) => setThicknessMm(fromUser(parseFloat(e.target.value) || 0))}
              className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-[11px] text-slate-400">Kerf ({unitLabel})</span>
            <input
              type="number"
              step={unitSystem === 'mm' ? 0.05 : 0.002}
              value={toUser(kerfMm).toFixed(unitSystem === 'mm' ? 2 : 4)}
              onChange={(e) => setKerfMm(fromUser(parseFloat(e.target.value) || 0))}
              className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
            />
          </label>
        </fieldset>

        {/* Finger Joints */}
        <fieldset className="grid gap-2 border border-slate-700 rounded-md p-3">
          <legend className="text-xs font-medium text-slate-300 px-1">Finger Joints</legend>
          
          <label className="grid gap-1">
            <span className="text-[11px] text-slate-400">Finger Width ({unitLabel})</span>
            <input
              type="number"
              step={unitSystem === 'mm' ? 0.01 : 0.001}
              value={fingerWidthText}
              onFocus={() => setIsEditingFingerWidth(true)}
              onChange={(e) => {
                const raw = e.target.value;
                setFingerWidthText(raw);
                // While typing: update live only when a complete number is present
                const trimmed = raw.trim();
                if (trimmed === '' || trimmed === '-' || trimmed === '.' || trimmed.endsWith('.')) return;
                const n = Number(trimmed);
                if (!Number.isFinite(n)) return;
                setFingerWidthMm(clampNumber(fromUser(n), 2, 200));
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  commitFingerWidth(fingerWidthText);
                  setIsEditingFingerWidth(false);
                  (e.target as HTMLInputElement).blur();
                }
                if (e.key === 'Escape') {
                  setIsEditingFingerWidth(false);
                  const v = toUser(fingerWidthMm);
                  const digits = unitSystem === 'mm' ? 2 : 3;
                  setFingerWidthText(String(Number(v.toFixed(digits))));
                  (e.target as HTMLInputElement).blur();
                }
              }}
              onBlur={() => {
                commitFingerWidth(fingerWidthText);
                setIsEditingFingerWidth(false);
              }}
              className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
            />
          </label>
        </fieldset>

        {/* Export Buttons */}
        <div className="grid gap-2 mt-auto">
          <button
            onClick={handleExportAll}
            className="px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium rounded-md"
          >
            Export All Panels
          </button>
        </div>
      </div>

      {/* Right Panel - Preview */}
      <div className="flex flex-col bg-slate-800 rounded-lg overflow-hidden">
        {/* Preview Header with Mode + Tabs + Zoom */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="inline-flex overflow-hidden rounded-md border border-slate-700 bg-slate-900">
              <button
                type="button"
                onClick={() => setPreviewMode('2d')}
                className={
                  previewMode === '2d'
                    ? 'px-3 py-1 text-[11px] font-medium text-slate-950 bg-sky-300'
                    : 'px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-900'
                }
              >
                2D
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

            {previewMode === '2d' ? (
              <>
                <button
                  onClick={() => setViewMode('all')}
                  className={`px-2 py-1 text-[10px] rounded ${
                    viewMode === 'all'
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  All
                </button>
                {faceKeys.map((name) => (
                  <button
                    key={name}
                    onClick={() => setViewMode(name)}
                    className={`px-2 py-1 text-[10px] rounded uppercase ${
                      viewMode === name
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </>
            ) : null}
          </div>

          {previewMode === '2d' ? (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500">Zoom</span>
              <input
                type="range"
                min="50"
                max="250"
                value={previewZoom}
                className="w-24"
                onChange={(e) => {
                  setPreviewZoom(parseInt(e.target.value));
                }}
              />
            </div>
          ) : (
            <div className="text-[10px] text-slate-500">Orbit / pan / zoom with mouse</div>
          )}
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
          {previewMode === '3d' ? (
            <div className="w-full h-full min-h-[520px]">
              <BoxPreview3D
                settings={settingsFor3d}
                faces={facesFor3d}
                importedItems={[]}
                lidRotationOffset={[0, 0, Math.PI]}
                lidPositionOffsetMm={[0, -(thicknessMm + 1.75) + 1.5 - 2, thicknessMm + 1]}
              />
            </div>
          ) : viewMode === 'all' ? (
            <div
              id="preview-content"
              className="grid w-full max-w-5xl grid-cols-2 gap-6 transition-transform"
              style={{ transform: `scale(${previewZoom / 100})`, transformOrigin: 'center' }}
            >
              {faceKeys.map((name) => (
                <div key={name} className="bg-slate-900 rounded p-3 w-full">
                  <div className="relative w-full aspect-square bg-white rounded flex items-center justify-center overflow-hidden">
                    <div
                      className="absolute inset-0 [&_svg]:h-full [&_svg]:w-full [&_svg]:block"
                      dangerouslySetInnerHTML={{ __html: faceSvgs.get(name) || '' }}
                    />
                    {(() => {
                      const art = faceArtworkByFace[name];
                      const face = faceByName.get(name);
                      if (!art || !art.imageDataUrl || !face) return null;
                      const leftPct = (art.placement.x / Math.max(face.width, 1)) * 100;
                      const topPct = (art.placement.y / Math.max(face.height, 1)) * 100;
                      const wPct = Math.max(1, Math.min(200, art.placement.scale * 100));
                      return (
                        <img
                          src={art.imageDataUrl}
                          alt="Artwork"
                          className="absolute pointer-events-none"
                          style={{
                            left: `${leftPct}%`,
                            top: `${topPct}%`,
                            width: `${wPct}%`,
                            transform: `translate(-50%, -50%) rotate(${art.placement.rotationDeg}deg)`,
                            transformOrigin: 'center',
                            opacity: 0.85,
                          }}
                        />
                      );
                    })()}
                  </div>
                  <div className="mt-2 text-xs font-medium text-slate-300 text-center uppercase">{name}</div>
                </div>
              ))}
            </div>
          ) : (
            <div
              id="preview-content"
              className="transition-transform"
              style={{ transform: `scale(${previewZoom / 100})`, transformOrigin: 'center' }}
            >
              <div className="bg-slate-900 rounded p-6 max-w-2xl">
                <div className="text-sm text-slate-200 mb-1 uppercase font-medium text-center">{viewMode}</div>
                {selectedFace ? (
                  <div className="text-[11px] text-slate-400 mb-4 text-center">{selectedFaceDimsLabel}</div>
                ) : (
                  <div className="text-[11px] text-slate-500 mb-4 text-center">No dimensions</div>
                )}
                <div className="relative bg-white rounded p-4 flex items-center justify-center" style={{ minWidth: '500px', minHeight: '500px' }}>
                  <div
                    className="absolute inset-0 [&_svg]:h-full [&_svg]:w-full [&_svg]:block"
                    dangerouslySetInnerHTML={{ __html: faceSvgs.get(viewMode) || '' }}
                  />
                  {(() => {
                    const art = faceArtworkByFace[viewMode];
                    const face = faceByName.get(viewMode);
                    if (!art || !art.imageDataUrl || !face) return null;
                    const leftPct = (art.placement.x / Math.max(face.width, 1)) * 100;
                    const topPct = (art.placement.y / Math.max(face.height, 1)) * 100;
                    const wPct = Math.max(1, Math.min(200, art.placement.scale * 100));
                    return (
                      <img
                        src={art.imageDataUrl}
                        alt="Artwork"
                        className="absolute pointer-events-none"
                        style={{
                          left: `${leftPct}%`,
                          top: `${topPct}%`,
                          width: `${wPct}%`,
                          transform: `translate(-50%, -50%) rotate(${art.placement.rotationDeg}deg)`,
                          transformOrigin: 'center',
                          opacity: 0.85,
                        }}
                      />
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

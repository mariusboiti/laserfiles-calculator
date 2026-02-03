import { bboxOverlap, computeBBox, type BBox, type MatrixLike, type Point, type Polygon, polygonsIntersect, polygonIntersectsRect, transformPolygon } from "./geometry";
import type { PolygonPart } from "./parseSvgPolygons";

export type KeepOutRect = BBox & { id: string };

export type ShapePlacedPart = {
  part: PolygonPart;
  xMm: number;
  yMm: number;
  rotationDeg: 0 | 90 | 180 | 270;
  mirrored: boolean;
  locked?: boolean;
  polygonWorld: Polygon;
  bboxWorld: BBox;
};

export type ShapeSheetLayout = {
  index: number;
  placed: ShapePlacedPart[];
};

export type ShapeNestingResult = {
  sheets: ShapeSheetLayout[];
  unplaced: PolygonPart[];
};

export type ShapeStrategy = "fast" | "balanced" | "max";

export type LockedPlacement = {
  sheetIndex: number;
  xMm: number;
  yMm: number;
  rotationDeg: 0 | 90 | 180 | 270;
  mirrored: boolean;
  part: PolygonPart;
};

export type ShapeNestingInput = {
  parts: PolygonPart[];
  sheetWidthMm: number;
  sheetHeightMm: number;
  marginMm: number;
  gapMm: number;
  allowRotation: boolean;
  allowMirror: boolean;
  keepOuts?: KeepOutRect[];
  locked?: LockedPlacement[];
  strategy?: ShapeStrategy;
  seed?: number;
};

type Candidate = {
  x: number;
  y: number;
};

class RNG {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed || 1;
  }
  next(): number {
    // simple LCG
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 0xffffffff;
  }
}

function shuffleWithSeed<T>(arr: T[], seed: number): T[] {
  const rng = new RNG(seed || 1);
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function transformLocalPolygon(
  part: PolygonPart,
  x: number,
  y: number,
  rotationDeg: 0 | 90 | 180 | 270,
  mirrored: boolean
): { poly: Polygon; bbox: BBox } {
  let m: MatrixLike = { a: 1, b: 0, c: 0, d: 1, e: x, f: y };

  // apply rotation and optional mirror around origin, then translate
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  let a = cos;
  let b = sin;
  let c = -sin;
  let d = cos;

  if (mirrored) {
    // mirror around Y axis in local space
    a = -a;
    c = -c;
  }

  const mLocal: MatrixLike = {
    a,
    b,
    c,
    d,
    e: x,
    f: y,
  };

  const poly = transformPolygon(part.polygon, mLocal);
  const bbox = computeBBox(poly);
  return { poly, bbox };
}

function fitsInSheet(bbox: BBox, innerWidth: number, innerHeight: number, margin: number): boolean {
  if (bbox.width <= 0 || bbox.height <= 0) return false;
  if (bbox.x < margin || bbox.y < margin) return false;
  if (bbox.x + bbox.width > margin + innerWidth) return false;
  if (bbox.y + bbox.height > margin + innerHeight) return false;
  return true;
}

function collidesWithKeepOuts(poly: Polygon, bbox: BBox, keepOuts: KeepOutRect[] | undefined): boolean {
  if (!keepOuts || keepOuts.length === 0) return false;
  for (const ko of keepOuts) {
    if (!bboxOverlap(bbox, ko)) continue;
    if (polygonIntersectsRect(poly, ko)) return true;
  }
  return false;
}

function collidesWithPlaced(poly: Polygon, bbox: BBox, placed: ShapePlacedPart[]): boolean {
  for (const p of placed) {
    if (!bboxOverlap(bbox, p.bboxWorld)) continue;
    if (polygonsIntersect(poly, p.polygonWorld)) return true;
  }
  return false;
}

export function runShapeNesting(input: ShapeNestingInput): ShapeNestingResult {
  const {
    parts,
    sheetWidthMm,
    sheetHeightMm,
    marginMm,
    gapMm,
    allowRotation,
    allowMirror,
    keepOuts,
    locked,
    strategy = "balanced",
    seed = 1,
  } = input;

  if (sheetWidthMm <= 0 || sheetHeightMm <= 0) {
    throw new Error("Sheet size must be greater than zero.");
  }

  const innerWidth = Math.max(0, sheetWidthMm - 2 * marginMm);
  const innerHeight = Math.max(0, sheetHeightMm - 2 * marginMm);

  if (innerWidth <= 0 || innerHeight <= 0) {
    throw new Error("Sheet is too small for the given margin.");
  }

  const sheets: ShapeSheetLayout[] = [];
  const unplaced: PolygonPart[] = [];

  const areaOfPart = (p: PolygonPart): number => p.bbox.width * p.bbox.height;

  const baseOrder = [...parts].sort((a, b) => areaOfPart(b) - areaOfPart(a));
  const orderedParts =
    strategy === "fast" ? baseOrder : shuffleWithSeed(baseOrder, seed || 1);

  const orientations: Array<0 | 90 | 180 | 270> = allowRotation
    ? [0, 90, 180, 270]
    : [0];

  const mirrorOptions = allowMirror ? [false, true] : [false];

  const maxCandidatesPerPart = strategy === "max" ? 200 : strategy === "balanced" ? 80 : 40;

  const startNewSheet = (): { layout: ShapeSheetLayout; candidates: Candidate[] } => {
    const layout: ShapeSheetLayout = { index: sheets.length, placed: [] };
    sheets.push(layout);
    const candidates: Candidate[] = [{ x: marginMm, y: marginMm }];
    return { layout, candidates };
  };

  // seed first sheet
  let { layout, candidates } = startNewSheet();

  const addCandidate = (c: Candidate) => {
    // avoid duplicates / out of bounds rough filter
    if (c.x < marginMm || c.y < marginMm) return;
    if (candidates.some((p) => Math.abs(p.x - c.x) < 0.01 && Math.abs(p.y - c.y) < 0.01)) {
      return;
    }
    candidates.push(c);
  };

  const sortCandidates = () => {
    candidates.sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    });
  };

  // Apply locked placements first if provided
  const lockedBySheet = new Map<number, LockedPlacement[]>();
  if (locked && locked.length) {
    for (const lp of locked) {
      const arr = lockedBySheet.get(lp.sheetIndex) ?? [];
      arr.push(lp);
      lockedBySheet.set(lp.sheetIndex, arr);
    }

    const sheetIndices = Array.from(lockedBySheet.keys()).sort((a, b) => a - b);
    for (const idx of sheetIndices) {
      while (sheets.length <= idx) {
        startNewSheet();
      }
      const layoutLocked = sheets[idx];
      const lockedList = lockedBySheet.get(idx)!;
      for (const lp of lockedList) {
        const { poly, bbox } = transformLocalPolygon(
          lp.part,
          lp.xMm,
          lp.yMm,
          lp.rotationDeg,
          lp.mirrored
        );
        layoutLocked.placed.push({
          part: lp.part,
          xMm: lp.xMm,
          yMm: lp.yMm,
          rotationDeg: lp.rotationDeg,
          mirrored: lp.mirrored,
          locked: true,
          polygonWorld: poly,
          bboxWorld: bbox,
        });
      }
    }

    // reset current sheet and candidates to last locked sheet or new one
    if (sheets.length > 0) {
      layout = sheets[sheets.length - 1];
      candidates = [{ x: marginMm, y: marginMm }];
    }
  }

  for (const part of orderedParts) {
    let placedHere: ShapePlacedPart | null = null;
    let tries = 0;

    const tryPlaceOnExistingSheets = (): boolean => {
      for (const s of sheets) {
        // simple approach: consider each sheet independently using its placed as obstacles
        const localCandidates: Candidate[] = [{ x: marginMm, y: marginMm }];
        let localPlaced = s.placed;
        let localTries = 0;

        const addLocalCandidate = (c: Candidate) => {
          if (c.x < marginMm || c.y < marginMm) return;
          if (
            localCandidates.some(
              (p) => Math.abs(p.x - c.x) < 0.01 && Math.abs(p.y - c.y) < 0.01
            )
          ) {
            return;
          }
          localCandidates.push(c);
        };

        while (localCandidates.length && localTries < maxCandidatesPerPart) {
          sortCandidates();
          const cand = localCandidates.shift()!;
          localTries++;
          for (const rot of orientations) {
            for (const mir of mirrorOptions) {
              const { poly, bbox } = transformLocalPolygon(
                part,
                cand.x,
                cand.y,
                rot,
                mir
              );

              const expanded: BBox = {
                x: bbox.x,
                y: bbox.y,
                width: bbox.width + gapMm,
                height: bbox.height + gapMm,
              };

              if (!fitsInSheet(expanded, innerWidth, innerHeight, marginMm)) continue;
              if (collidesWithKeepOuts(poly, expanded, keepOuts)) continue;
              if (collidesWithPlaced(poly, expanded, localPlaced)) continue;

              const placed: ShapePlacedPart = {
                part,
                xMm: cand.x,
                yMm: cand.y,
                rotationDeg: rot,
                mirrored: mir,
                locked: false,
                polygonWorld: poly,
                bboxWorld: expanded,
              };

              localPlaced = [...localPlaced, placed];
              s.placed = localPlaced;

              addLocalCandidate({ x: cand.x + expanded.width, y: cand.y });
              addLocalCandidate({ x: cand.x, y: cand.y + expanded.height });

              placedHere = placed;
              return true;
            }
          }
        }
      }
      return false;
    };

    // try place on existing sheets first (for more compact layouts)
    if (tryPlaceOnExistingSheets()) {
      continue;
    }

    // otherwise, try on current sheet, possibly creating new sheets
    while (!placedHere) {
      sortCandidates();
      if (!candidates.length || tries >= maxCandidatesPerPart) {
        // start a new sheet
        const sheetInfo = startNewSheet();
        layout = sheetInfo.layout;
        candidates = sheetInfo.candidates;
        tries = 0;
        continue;
      }

      const cand = candidates.shift()!;
      tries++;

      for (const rot of orientations) {
        for (const mir of mirrorOptions) {
          const { poly, bbox } = transformLocalPolygon(part, cand.x, cand.y, rot, mir);
          const expanded: BBox = {
            x: bbox.x,
            y: bbox.y,
            width: bbox.width + gapMm,
            height: bbox.height + gapMm,
          };

          if (!fitsInSheet(expanded, innerWidth, innerHeight, marginMm)) continue;
          if (collidesWithKeepOuts(poly, expanded, keepOuts)) continue;
          if (collidesWithPlaced(poly, expanded, layout.placed)) continue;

          const placed: ShapePlacedPart = {
            part,
            xMm: cand.x,
            yMm: cand.y,
            rotationDeg: rot,
            mirrored: mir,
            locked: false,
            polygonWorld: poly,
            bboxWorld: expanded,
          };

          layout.placed.push(placed);

          addCandidate({ x: cand.x + expanded.width, y: cand.y });
          addCandidate({ x: cand.x, y: cand.y + expanded.height });

          placedHere = placed;
          break;
        }
        if (placedHere) break;
      }

      if (strategy === "fast" && placedHere) {
        break;
      }
    }

    if (!placedHere) {
      unplaced.push(part);
    }
  }

  return { sheets, unplaced };
}

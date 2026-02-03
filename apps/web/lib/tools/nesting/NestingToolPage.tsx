"use client";

import React, { useCallback, useMemo, useState } from "react";
import { parseSvgParts, ParsedPart } from "./parseSvgParts";
import { parseSvgPolygons, PolygonPart } from "./parseSvgPolygons";
import { runShelfNesting, ShelfNestingResult } from "./shelfNesting";
import {
  runShapeNesting,
  ShapeNestingResult,
  transformLocalPolygon,
  KeepOutRect,
  LockedPlacement,
} from "./shapeNesting";
import { exportLayoutSvg } from "./exportLayoutSvg";
import { exportShapeLayoutSvg } from "./exportShapeLayoutSvg";

type ImportMode = "parts" | "single";
type AlgorithmMode = "basic" | "shape";
type ShapeStrategy = "fast" | "balanced" | "max";

type LayoutPartRef = {
  id: string;
};

export type SheetConfig = {
  widthMm: number;
  heightMm: number;
  marginMm: number;
  gapMm: number;
  allowRotation: boolean;
};

const defaultConfig: SheetConfig = {
  widthMm: 300,
  heightMm: 200,
  marginMm: 5,
  gapMm: 2,
  allowRotation: true,
};

export function NestingToolPage() {
  const [svgText, setSvgText] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parts, setParts] = useState<ParsedPart[]>([]);
  const [polygonParts, setPolygonParts] = useState<PolygonPart[]>([]);
  const [layoutParts, setLayoutParts] = useState<LayoutPartRef[]>([]);
  const [sheet, setSheet] = useState<SheetConfig>(defaultConfig);
  const [nesting, setNesting] = useState<ShelfNestingResult | null>(null);
  const [shapeNesting, setShapeNesting] = useState<ShapeNestingResult | null>(null);
  const [nestError, setNestError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [algorithm, setAlgorithm] = useState<AlgorithmMode>("shape");
  const [importMode, setImportMode] = useState<ImportMode>("parts");
  const [singleCount, setSingleCount] = useState<number>(1);
  const [shapeStrategy, setShapeStrategy] = useState<ShapeStrategy>("balanced");
  const [shapeToleranceMm, setShapeToleranceMm] = useState<number>(0.5);
  const [allowMirror, setAllowMirror] = useState<boolean>(false);
  const [seed, setSeed] = useState<number>(1);
  const [currentSheetIndex, setCurrentSheetIndex] = useState(0);
  const [keepOuts, setKeepOuts] = useState<KeepOutRect[]>([]);
  const [lockedPlacements, setLockedPlacements] = useState<LockedPlacement[]>([]);
  const [selectedLockedIndex, setSelectedLockedIndex] = useState<number | null>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".svg")) {
      setParseError("Please upload an SVG file.");
      setSvgText(null);
      setParts([]);
      setPolygonParts([]);
      setLayoutParts([]);
      setNesting(null);
      setShapeNesting(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setSvgText(text);
      try {
        const parsedBasic = parseSvgParts(text);
        setParts(parsedBasic.parts);

        const parsedPoly = parseSvgPolygons(text, { toleranceMm: shapeToleranceMm });
        setPolygonParts(parsedPoly.parts);

        setLayoutParts([]);
        setParseError(parsedBasic.warning ?? parsedPoly.warning ?? null);
        setNesting(null);
        setShapeNesting(null);
        setNestError(null);
      } catch (err: any) {
        setParseError(err?.message || "Failed to parse SVG.");
        setParts([]);
        setPolygonParts([]);
        setLayoutParts([]);
        setNesting(null);
        setShapeNesting(null);
      }
    };
    reader.onerror = () => {
      setParseError("Failed to read SVG file.");
      setSvgText(null);
      setParts([]);
      setPolygonParts([]);
      setLayoutParts([]);
      setNesting(null);
      setShapeNesting(null);
    };
    reader.readAsText(file);
  }, [shapeToleranceMm]);

  const handleConfigChange = useCallback(
    (field: keyof SheetConfig, value: number | boolean) => {
      setSheet((prev) => ({
        ...prev,
        [field]: value,
      }));
      setNesting(null);
      setShapeNesting(null);
      setNestError(null);
      setCurrentSheetIndex(0);
      setLockedPlacements([]);
      setSelectedLockedIndex(null);
    },
    []
  );

  const handleRunNesting = useCallback(() => {
    setNestError(null);
    if (algorithm === "basic") {
      if (!parts.length) {
        setNestError("No parts found in SVG.");
        return;
      }

      let preparedParts: ParsedPart[] = [];
      if (importMode === "parts") {
        preparedParts = parts;
      } else {
        const base = parts[0];
        if (!base) {
          setNestError("No part found in SVG for Single part + Count mode.");
          return;
        }
        const count = Math.max(1, Math.floor(singleCount) || 1);
        preparedParts = Array.from({ length: count }, () => ({ ...base }));
      }

      setRunning(true);
      try {
        const result = runShelfNesting({
          parts: preparedParts,
          sheetWidthMm: sheet.widthMm,
          sheetHeightMm: sheet.heightMm,
          marginMm: sheet.marginMm,
          gapMm: sheet.gapMm,
          allowRotation: sheet.allowRotation,
        });

        setLayoutParts(preparedParts.map((p) => ({ id: p.id })));
        setNesting(result);
        setShapeNesting(null);
        setCurrentSheetIndex(0);

        if (result.unplaced.length > 0) {
          setNestError(
            `Some parts could not be placed within the sheet bounds. Unplaced: ${result.unplaced.length}.`
          );
        }
      } catch (err: any) {
        setNestError(err?.message || "Failed to run nesting.");
        setNesting(null);
        setLayoutParts([]);
      } finally {
        setRunning(false);
      }
      return;
    }

    // shape-aware algorithm
    if (!polygonParts.length) {
      setNestError("No polygon shapes found in SVG for shape-aware nesting.");
      return;
    }

    let preparedPolys: PolygonPart[] = [];
    if (importMode === "parts") {
      preparedPolys = polygonParts;
    } else {
      const base = polygonParts[0];
      if (!base) {
        setNestError("No part found in SVG for Single part + Count mode.");
        return;
      }
      const count = Math.max(1, Math.floor(singleCount) || 1);
      preparedPolys = Array.from({ length: count }, (_, idx) => ({
        ...base,
        id: `${base.id}-copy-${idx}`,
      }));
    }

    setRunning(true);
    try {
      const result = runShapeNesting({
        parts: preparedPolys,
        sheetWidthMm: sheet.widthMm,
        sheetHeightMm: sheet.heightMm,
        marginMm: sheet.marginMm,
        gapMm: sheet.gapMm,
        allowRotation: sheet.allowRotation,
        allowMirror,
        keepOuts,
        locked: lockedPlacements,
        strategy: shapeStrategy,
        seed,
      });

      setLayoutParts(preparedPolys.map((p) => ({ id: p.id })));
      setShapeNesting(result);
      setNesting(null);
      setCurrentSheetIndex(0);

      if (result.unplaced.length > 0) {
        setNestError(
          `Some parts could not be placed within the sheet bounds. Unplaced: ${result.unplaced.length}.`
        );
      }
    } catch (err: any) {
      setNestError(err?.message || "Failed to run shape-aware nesting.");
      setShapeNesting(null);
      setLayoutParts([]);
    } finally {
      setRunning(false);
    }
  }, [
    algorithm,
    parts,
    polygonParts,
    sheet,
    importMode,
    singleCount,
    allowMirror,
    shapeStrategy,
    seed,
    keepOuts,
    lockedPlacements,
  ]);

  const handleExportCurrentSheet = useCallback(() => {
    if (!svgText) return;

    if (algorithm === "basic") {
      if (!nesting || !nesting.sheets.length) return;
      const sheetLayout = nesting.sheets[Math.min(currentSheetIndex, nesting.sheets.length - 1)];
      try {
        const blob = new Blob([
          exportLayoutSvg({
            originalSvg: svgText,
            sheetWidthMm: sheet.widthMm,
            sheetHeightMm: sheet.heightMm,
            marginMm: sheet.marginMm,
            sheet: sheetLayout,
          }),
        ], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `nesting-sheet-${sheetLayout.index + 1}.svg`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Failed to export SVG", err);
      }
      return;
    }

    if (!shapeNesting || !shapeNesting.sheets.length) return;
    const shapeSheet = shapeNesting.sheets[Math.min(currentSheetIndex, shapeNesting.sheets.length - 1)];
    try {
      const blob = new Blob([
        exportShapeLayoutSvg({
          sheetWidthMm: sheet.widthMm,
          sheetHeightMm: sheet.heightMm,
          sheet: shapeSheet,
          keepOuts,
        }),
      ], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nesting-shape-sheet-${shapeSheet.index + 1}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export shape SVG", err);
    }
  }, [algorithm, svgText, nesting, shapeNesting, sheet, currentSheetIndex, keepOuts]);

  const handleExportAllSheets = useCallback(() => {
    if (!svgText) return;

    if (algorithm === "basic") {
      if (!nesting || !nesting.sheets.length) return;
      try {
        nesting.sheets.forEach((s) => {
          const svg = exportLayoutSvg({
            originalSvg: svgText,
            sheetWidthMm: sheet.widthMm,
            sheetHeightMm: sheet.heightMm,
            marginMm: sheet.marginMm,
            sheet: s,
          });
          const blob = new Blob([svg], { type: "image/svg+xml" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `nesting-sheet-${s.index + 1}.svg`;
          a.click();
          URL.revokeObjectURL(url);
        });
      } catch (err) {
        console.error("Failed to export all sheets", err);
      }
      return;
    }

    if (!shapeNesting || !shapeNesting.sheets.length) return;
    try {
      shapeNesting.sheets.forEach((s) => {
        const svg = exportShapeLayoutSvg({
          sheetWidthMm: sheet.widthMm,
          sheetHeightMm: sheet.heightMm,
          sheet: s,
          keepOuts,
        });
        const blob = new Blob([svg], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `nesting-shape-sheet-${s.index + 1}.svg`;
        a.click();
        URL.revokeObjectURL(url);
      });
    } catch (err) {
      console.error("Failed to export all shape sheets", err);
    }
  }, [algorithm, svgText, nesting, shapeNesting, sheet, keepOuts]);

  const lockCurrentLayout = useCallback(() => {
    if (!shapeNesting) return;
    const locks: LockedPlacement[] = [];
    shapeNesting.sheets.forEach((s) => {
      s.placed.forEach((p) => {
        locks.push({
          sheetIndex: s.index,
          xMm: p.xMm,
          yMm: p.yMm,
          rotationDeg: p.rotationDeg,
          mirrored: p.mirrored,
          part: p.part,
        });
      });
    });
    setLockedPlacements(locks);
    setSelectedLockedIndex(locks.length ? 0 : null);
  }, [shapeNesting]);

  const clearLocked = useCallback(() => {
    setLockedPlacements([]);
    setSelectedLockedIndex(null);
  }, []);

  const removeLocked = useCallback((index: number) => {
    setLockedPlacements((prev) => prev.filter((_, i) => i !== index));
    setSelectedLockedIndex((prev) => {
      if (prev === null) return prev;
      if (index < prev) return prev - 1;
      if (index === prev) return null;
      return prev;
    });
  }, []);

  const updateLockedPlacement = useCallback(
    (index: number, patch: Partial<LockedPlacement>) => {
      setLockedPlacements((prev) => {
        if (index < 0 || index >= prev.length) return prev;
        const next = [...prev];
        next[index] = { ...next[index], ...patch } as LockedPlacement;
        return next;
      });
    },
    []
  );

  const addKeepOut = useCallback(() => {
    const baseW = Math.max(10, Math.min(100, sheet.widthMm / 4));
    const baseH = Math.max(10, Math.min(100, sheet.heightMm / 4));
    const ko: KeepOutRect = {
      id: `ko-${Date.now()}`,
      x: sheet.marginMm,
      y: sheet.marginMm,
      width: baseW,
      height: baseH,
    };
    setKeepOuts((prev) => [...prev, ko]);
  }, [sheet.heightMm, sheet.marginMm, sheet.widthMm]);

  const updateKeepOut = useCallback((id: string, field: keyof KeepOutRect, value: number) => {
    setKeepOuts((prev) =>
      prev.map((k) => (k.id === id ? { ...k, [field]: Math.max(0, value) } : k))
    );
  }, []);

  const removeKeepOut = useCallback((id: string) => {
    setKeepOuts((prev) => prev.filter((k) => k.id !== id));
  }, []);

  const previewBox = useMemo(() => {
    if (!sheet.widthMm || !sheet.heightMm) return { width: 0, height: 0 };
    const maxPx = 420;
    const scale = Math.min(maxPx / sheet.widthMm, maxPx / sheet.heightMm, 1);
    return {
      width: sheet.widthMm * scale,
      height: sheet.heightMm * scale,
      scale,
    };
  }, [sheet.widthMm, sheet.heightMm]);

  const isShapeAlgo = algorithm === "shape";

  const totalSheets = isShapeAlgo
    ? shapeNesting?.sheets.length ?? 0
    : nesting?.sheets.length ?? 0;

  const totalPlaced = isShapeAlgo
    ? shapeNesting
      ? shapeNesting.sheets.reduce((sum, s) => sum + s.placed.length, 0)
      : 0
    : nesting
    ? nesting.sheets.reduce((sum, s) => sum + s.placed.length, 0)
    : 0;

  const unplacedCount = isShapeAlgo
    ? shapeNesting?.unplaced.length ?? 0
    : nesting?.unplaced.length ?? 0;

  const currentSheet = useMemo(() => {
    if (isShapeAlgo) {
      if (!shapeNesting || !shapeNesting.sheets.length) return null;
      const idx = Math.min(currentSheetIndex, shapeNesting.sheets.length - 1);
      return shapeNesting.sheets[idx];
    }
    if (!nesting || !nesting.sheets.length) return null;
    const idx = Math.min(currentSheetIndex, nesting.sheets.length - 1);
    return nesting.sheets[idx];
  }, [isShapeAlgo, nesting, shapeNesting, currentSheetIndex]);

  type PartStat = {
    id: string;
    label: string;
    count: number;
    placed: number;
    unplaced: number;
  };

  const partStats: PartStat[] = useMemo(() => {
    if (!layoutParts.length) return [];

    const map = new Map<string, PartStat>();

    layoutParts.forEach((p, index) => {
      if (!map.has(p.id)) {
        map.set(p.id, {
          id: p.id,
          label: `Part ${index + 1}`,
          count: 0,
          placed: 0,
          unplaced: 0,
        });
      }
      const stat = map.get(p.id)!;
      stat.count += 1;
    });

    if (!isShapeAlgo && nesting) {
      nesting.sheets.forEach((s) => {
        s.placed.forEach((p) => {
          const stat = map.get(p.part.id);
          if (stat) stat.placed += 1;
        });
      });
      nesting.unplaced.forEach((p) => {
        const stat = map.get(p.id);
        if (stat) stat.unplaced += 1;
      });
    }

    if (isShapeAlgo && shapeNesting) {
      shapeNesting.sheets.forEach((s) => {
        s.placed.forEach((p) => {
          const stat = map.get(p.part.id);
          if (stat) stat.placed += 1;
        });
      });
      shapeNesting.unplaced.forEach((p) => {
        const stat = map.get(p.id);
        if (stat) stat.unplaced += 1;
      });
    }

    return Array.from(map.values());
  }, [layoutParts, nesting, shapeNesting, isShapeAlgo]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-100">Input SVG</h3>
            <input
              type="file"
              accept="image/svg+xml,.svg"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-200 file:mr-4 file:rounded-md file:border-0 file:bg-sky-600 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-sky-500"
            />
            {parseError && (
              <p className="text-xs text-amber-400">{parseError}</p>
            )}
            <p className="text-xs text-slate-400">
              Nesting v2 can use either fast bounding boxes or shape-aware polygons.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-100">Algorithm</h3>
            <div className="flex flex-col gap-2 text-xs text-slate-300">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="algo-mode"
                  value="basic"
                  checked={algorithm === "basic"}
                  onChange={() => {
                    setAlgorithm("basic");
                    setNesting(null);
                    setShapeNesting(null);
                    setCurrentSheetIndex(0);
                  }}
                  className="h-3 w-3 border-slate-600 bg-slate-900 text-sky-500 focus:ring-sky-500/50"
                />
                <span>Basic: fast shelf nesting (bounding boxes)</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="algo-mode"
                  value="shape"
                  checked={algorithm === "shape"}
                  onChange={() => {
                    setAlgorithm("shape");
                    setNesting(null);
                    setShapeNesting(null);
                    setCurrentSheetIndex(0);
                  }}
                  className="h-3 w-3 border-slate-600 bg-slate-900 text-sky-500 focus:ring-sky-500/50"
                />
                <span>Advanced: shape-aware nesting (polygons)</span>
              </label>
            </div>

            {algorithm === "shape" && (
              <div className="mt-2 space-y-2 text-xs text-slate-300">
                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-1">
                    <span>Strategy</span>
                    <select
                      value={shapeStrategy}
                      onChange={(e) => setShapeStrategy(e.target.value as ShapeStrategy)}
                      className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/60"
                    >
                      <option value="fast">Fast</option>
                      <option value="balanced">Balanced</option>
                      <option value="max">Max parts</option>
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span>Shape tolerance (mm)</span>
                    <input
                      type="number"
                      min={0}
                      max={5}
                      step={0.1}
                      value={shapeToleranceMm}
                      onChange={(e) =>
                        setShapeToleranceMm(Math.max(0, Number(e.target.value) || 0))
                      }
                      className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/60"
                    />
                  </label>
                </div>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allowMirror}
                    onChange={(e) => setAllowMirror(e.target.checked)}
                    className="h-3 w-3 rounded border-slate-600 bg-slate-900 text-sky-500 focus:ring-sky-500/50"
                  />
                  <span>Allow mirror</span>
                </label>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-300 space-y-1">
                    <span>Seed</span>
                    <input
                      type="number"
                      value={seed}
                      onChange={(e) => setSeed(Number(e.target.value) || 1)}
                      className="w-24 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/60"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const next = seed + 1;
                      setSeed(next);
                      // re-run nesting with new seed
                      setTimeout(() => {
                        handleRunNesting();
                      }, 0);
                    }}
                    disabled={running || !polygonParts.length || algorithm !== "shape"}
                    className="mt-4 inline-flex items-center justify-center rounded-md border border-slate-600 px-3 py-1.5 text-[11px] font-medium text-slate-100 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Re-run (new seed)
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-100">Import mode</h3>
            <div className="flex flex-col gap-2 text-xs text-slate-300">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="import-mode"
                  value="parts"
                  checked={importMode === "parts"}
                  onChange={() => setImportMode("parts")}
                  className="h-3 w-3 border-slate-600 bg-slate-900 text-sky-500 focus:ring-sky-500/50"
                />
                <span>Mode A: Parts already separated in SVG</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="import-mode"
                  value="single"
                  checked={importMode === "single"}
                  onChange={() => setImportMode("single")}
                  className="h-3 w-3 border-slate-600 bg-slate-900 text-sky-500 focus:ring-sky-500/50"
                />
                <span>Mode B: Single part + Count</span>
              </label>
              {importMode === "single" && (
                <label className="mt-1 text-xs text-slate-300 space-y-1">
                  <span>Count</span>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={singleCount}
                    onChange={(e) =>
                      setSingleCount(Math.max(1, Number(e.target.value) || 1))
                    }
                    className="w-24 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/60"
                  />
                </label>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-100">Sheet settings</h3>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-slate-300 space-y-1">
                <span>Width (mm)</span>
                <input
                  type="number"
                  min={10}
                  max={5000}
                  value={sheet.widthMm}
                  onChange={(e) => handleConfigChange("widthMm", Number(e.target.value) || 0)}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/60"
                />
              </label>
              <label className="text-xs text-slate-300 space-y-1">
                <span>Height (mm)</span>
                <input
                  type="number"
                  min={10}
                  max={5000}
                  value={sheet.heightMm}
                  onChange={(e) => handleConfigChange("heightMm", Number(e.target.value) || 0)}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/60"
                />
              </label>
              <label className="text-xs text-slate-300 space-y-1">
                <span>Margin (mm)</span>
                <input
                  type="number"
                  min={0}
                  max={500}
                  value={sheet.marginMm}
                  onChange={(e) => handleConfigChange("marginMm", Number(e.target.value) || 0)}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/60"
                />
              </label>
              <label className="text-xs text-slate-300 space-y-1">
                <span>Gap (mm)</span>
                <input
                  type="number"
                  min={0}
                  max={500}
                  value={sheet.gapMm}
                  onChange={(e) => handleConfigChange("gapMm", Number(e.target.value) || 0)}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/60"
                />
              </label>
            </div>
            <label className="inline-flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={sheet.allowRotation}
                onChange={(e) => handleConfigChange("allowRotation", e.target.checked)}
                className="h-3 w-3 rounded border-slate-600 bg-slate-900 text-sky-500 focus:ring-sky-500/50"
              />
              <span>Allow rotations (0°, 90°, 180°, 270°)</span>
            </label>

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={handleRunNesting}
                disabled={(!parts.length && !polygonParts.length) || running}
                className="inline-flex items-center justify-center rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {running ? "Running..." : "Run nesting"}
              </button>
              <button
                type="button"
                onClick={handleExportCurrentSheet}
                disabled={
                  !svgText ||
                  (algorithm === "basic" && (!nesting || !nesting.sheets.length)) ||
                  (algorithm === "shape" && (!shapeNesting || !shapeNesting.sheets.length))
                }
                className="inline-flex items-center justify-center rounded-md border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Export current sheet
              </button>
              <button
                type="button"
                onClick={handleExportAllSheets}
                disabled={
                  !svgText ||
                  (algorithm === "basic" && (!nesting || !nesting.sheets.length)) ||
                  (algorithm === "shape" && (!shapeNesting || !shapeNesting.sheets.length))
                }
                className="inline-flex items-center justify-center rounded-md border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Export all sheets
              </button>
            </div>

            {algorithm === "shape" && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800 mt-2">
                <button
                  type="button"
                  onClick={addKeepOut}
                  className="inline-flex items-center justify-center rounded-md border border-orange-600 px-3 py-1.5 text-xs font-medium text-orange-300 hover:bg-orange-900/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  + Keep-out zone
                </button>
                <button
                  type="button"
                  onClick={lockCurrentLayout}
                  disabled={!shapeNesting || !shapeNesting.sheets.length}
                  className="inline-flex items-center justify-center rounded-md border border-yellow-600 px-3 py-1.5 text-xs font-medium text-yellow-300 hover:bg-yellow-900/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Lock layout
                </button>
                <button
                  type="button"
                  onClick={clearLocked}
                  disabled={!lockedPlacements.length}
                  className="inline-flex items-center justify-center rounded-md border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Clear locked
                </button>
              </div>
            )}

            <div className="text-xs text-slate-400 pt-1">
              <div>Parts detected: {parts.length}</div>
              <div>Sheets used: {totalSheets}</div>
              <div>Placed: {totalPlaced}</div>
              <div>Unplaced: {unplacedCount}</div>
            </div>
            {nestError && (
              <p className="text-xs text-amber-400">{nestError}</p>
            )}
          </div>

          {algorithm === "shape" && keepOuts.length > 0 && (
            <div className="rounded-xl border border-orange-900/50 bg-slate-950/40 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-orange-300">Keep-out zones</h3>
              <div className="space-y-2 text-xs">
                {keepOuts.map((k) => (
                  <div key={k.id} className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
                    <label className="text-slate-400">X</label>
                    <input
                      type="number"
                      value={k.x}
                      onChange={(e) => updateKeepOut(k.id, "x", Number(e.target.value))}
                      className="w-16 rounded border border-slate-700 bg-slate-900 px-1 py-0.5 text-xs text-slate-100"
                    />
                    <label className="text-slate-400">Y</label>
                    <input
                      type="number"
                      value={k.y}
                      onChange={(e) => updateKeepOut(k.id, "y", Number(e.target.value))}
                      className="w-16 rounded border border-slate-700 bg-slate-900 px-1 py-0.5 text-xs text-slate-100"
                    />
                    <label className="text-slate-400">W</label>
                    <input
                      type="number"
                      value={k.width}
                      onChange={(e) => updateKeepOut(k.id, "width", Number(e.target.value))}
                      className="w-16 rounded border border-slate-700 bg-slate-900 px-1 py-0.5 text-xs text-slate-100"
                    />
                    <label className="text-slate-400">H</label>
                    <input
                      type="number"
                      value={k.height}
                      onChange={(e) => updateKeepOut(k.id, "height", Number(e.target.value))}
                      className="w-16 rounded border border-slate-700 bg-slate-900 px-1 py-0.5 text-xs text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() => removeKeepOut(k.id)}
                      className="ml-auto text-red-400 hover:text-red-300"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {algorithm === "shape" && lockedPlacements.length > 0 && (
            <div className="rounded-xl border border-yellow-900/50 bg-slate-950/40 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-yellow-300">
                Locked placements ({lockedPlacements.length})
              </h3>
              <div className="max-h-40 overflow-auto space-y-1 text-xs text-slate-300">
                {lockedPlacements.map((lp, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer ${
                      selectedLockedIndex === idx
                        ? "bg-yellow-900/30 border border-yellow-700"
                        : "hover:bg-slate-800"
                    }`}
                    onClick={() => setSelectedLockedIndex(idx)}
                  >
                    <span className="truncate flex-1">
                      {lp.part.id} @ ({lp.xMm.toFixed(1)}, {lp.yMm.toFixed(1)})
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeLocked(idx);
                      }}
                      className="text-red-400 hover:text-red-300"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {partStats.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-slate-100">Parts list</h3>
              <div className="max-h-52 overflow-auto text-xs text-slate-300">
                <table className="w-full text-left border-collapse">
                  <thead className="text-[11px] uppercase text-slate-500">
                    <tr>
                      <th className="py-1 pr-2 font-medium">Part</th>
                      <th className="py-1 px-2 font-medium text-right">Count</th>
                      <th className="py-1 px-2 font-medium text-right">Placed</th>
                      <th className="py-1 px-2 font-medium text-right">Unplaced</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partStats.map((p) => (
                      <tr key={p.id} className="border-t border-slate-800">
                        <td className="py-1 pr-2">{p.label}</td>
                        <td className="py-1 px-2 text-right">{p.count}</td>
                        <td className="py-1 px-2 text-right text-emerald-300">
                          {p.placed}
                        </td>
                        <td className="py-1 px-2 text-right text-amber-300">
                          {p.unplaced}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-100">Preview</h3>
          {!currentSheet && (
            <p className="text-xs text-slate-400">
              Upload an SVG and run nesting to see the layout preview.
            </p>
          )}
          {currentSheet && previewBox.width > 0 && previewBox.height > 0 && (
            <>
              {totalSheets > 1 && (
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                  <span className="text-slate-400">Sheets:</span>
                  {(isShapeAlgo ? shapeNesting?.sheets : nesting?.sheets)?.map((s) => (
                    <button
                      key={s.index}
                      type="button"
                      onClick={() => setCurrentSheetIndex(s.index)}
                      className={`rounded-full px-2 py-0.5 border text-[11px] ${
                        currentSheetIndex === s.index
                          ? "border-sky-500 bg-sky-500/20 text-sky-200"
                          : "border-slate-700 bg-slate-900 text-slate-300 hover:border-sky-500/70 hover:text-sky-200"
                      }`}
                    >
                      Sheet {s.index + 1}
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-2 inline-block rounded-lg border border-slate-800 bg-slate-900 p-2">
                {algorithm === "basic" && nesting && (
                  <svg
                    width={previewBox.width}
                    height={previewBox.height}
                    viewBox={`0 0 ${sheet.widthMm} ${sheet.heightMm}`}
                    className="max-w-full h-auto"
                  >
                    <rect
                      x={0}
                      y={0}
                      width={sheet.widthMm}
                      height={sheet.heightMm}
                      fill="#020617"
                      stroke="#1e293b"
                      strokeWidth={0.5}
                    />
                    {currentSheet.placed.map((p) => (
                      <g
                        key={`${p.part.id}-${(p as any).xMm}-${(p as any).yMm}-${(p as any).rotationDeg}`}
                        transform={`translate(${(p as any).xMm},${(p as any).yMm}) rotate(${(p as any).rotationDeg})`}
                      >
                        <rect
                          x={0}
                          y={0}
                          width={(p as any).widthMm}
                          height={(p as any).heightMm}
                          fill="#0f172a"
                          stroke="#38bdf8"
                          strokeWidth={0.4}
                        />
                      </g>
                    ))}
                  </svg>
                )}
                {algorithm === "shape" && shapeNesting && (
                  <svg
                    width={previewBox.width}
                    height={previewBox.height}
                    viewBox={`0 0 ${sheet.widthMm} ${sheet.heightMm}`}
                    className="max-w-full h-auto"
                  >
                    <rect
                      x={0}
                      y={0}
                      width={sheet.widthMm}
                      height={sheet.heightMm}
                      fill="#020617"
                      stroke="#1e293b"
                      strokeWidth={0.5}
                    />
                    {keepOuts.map((k) => (
                      <rect
                        key={k.id}
                        x={k.x}
                        y={k.y}
                        width={k.width}
                        height={k.height}
                        fill="rgba(249,115,22,0.15)"
                        stroke="#f97316"
                        strokeWidth={0.4}
                        strokeDasharray="3 2"
                      />
                    ))}
                    {currentSheet.placed.map((p: any) => (
                      <polygon
                        key={`${p.part.id}-${p.xMm}-${p.yMm}-${p.rotationDeg}-${p.mirrored}`}
                        points={p.polygonWorld
                          .map((pt: any) => `${pt.x},${pt.y}`)
                          .join(" ")}
                        fill={p.locked ? "#1e3a5f" : "#0f172a"}
                        stroke={p.locked ? "#facc15" : "#38bdf8"}
                        strokeWidth={0.4}
                      />
                    ))}
                  </svg>
                )}
              </div>
            </>
          )}
          {unplacedCount > 0 && (
            <p className="mt-2 text-xs text-amber-400">
              Warning: {unplacedCount} part(s) could not be placed on the sheet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * TestCardPanel
 *
 * UI for generating a laser calibration test card as an SVG grid
 * of power x speed combinations.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Download, Info } from 'lucide-react';
import { generateTestCardSvg, TestCardCell } from '../../utils/generateTestCardSvg';
import { generatePhotoSampleTestCardPng, PhotoSampleTestCardConfig } from '../../utils/generatePhotoSampleTestCardPng';
import { useImageStore } from '../../store/useImageStore';
import type { TestCardFormValues as FormState, TestCardPatternType } from '../../types';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'material';
}

// Layout constants for the Test Card grid. These values must mirror the
// configuration used in the SVG generator so that the PNG export matches
// the SVG layout.
const CELL_WIDTH_MM = 24;
const CELL_HEIGHT_MM = 24;
const PADDING_MM = 10;
const TITLE_HEIGHT_MM = 16;

export function TestCardPanel() {
  const { testCardForm, setTestCardForm, processedImageInfo, processedImage } = useImageStore();

  const [form, setForm] = useState<FormState>(() =>
    testCardForm ?? {
      materialName: 'Plywood',
      thicknessMm: '',
      minPower: 10,
      maxPower: 90,
      stepsPower: 5,
      minSpeed: 200,
      maxSpeed: 1200,
      stepsSpeed: 6,
      dpi: 318,
      patternType: 'gradientDetail',
    }
  );

  const [error, setError] = useState<string | null>(null);
  const [previewScale, setPreviewScale] = useState<number>(2.5); // default zoom for on-screen preview
  const hasPhotoSample = !!processedImageInfo?.sampleDataUrl;

  // Persist form to global store so it can be saved in Project files
  useEffect(() => {
    setTestCardForm(form);
  }, [form, setTestCardForm]);

  // If a project was loaded with patternType = 'photoSample' but there is no
  // processed photo available, gracefully fall back to 'gradientDetail'.
  useEffect(() => {
    if (!hasPhotoSample && form.patternType === 'photoSample') {
      setForm((prev) => ({ ...prev, patternType: 'gradientDetail' }));
    }
  }, [hasPhotoSample, form.patternType]);

  const handleNumberChange = (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      const num = value === '' ? NaN : Number(value);
      setForm((prev) => ({
        ...prev,
        [field]: Number.isNaN(num) ? (prev[field] as number) : num,
      }));
    };

  const handleStringChange = (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handlePatternChange = (pattern: TestCardPatternType) => {
    setForm((prev) => ({ ...prev, patternType: pattern }));
  };

  const validation = useMemo(() => {
    const messages: string[] = [];

    if (!(form.minPower < form.maxPower)) {
      messages.push('Min Power must be less than Max Power.');
    }
    if (form.stepsPower < 2) {
      messages.push('Power steps must be at least 2.');
    }
    if (!(form.minSpeed < form.maxSpeed)) {
      messages.push('Min Speed must be less than Max Speed.');
    }
    if (form.stepsSpeed < 2) {
      messages.push('Speed steps must be at least 2.');
    }
    if (form.dpi <= 0) {
      messages.push('DPI must be greater than 0.');
    }

    return {
      valid: messages.length === 0,
      messages,
    };
  }, [form]);

  const lineIntervalMm = useMemo(() => {
    if (form.dpi <= 0) return null;
    return 25.4 / form.dpi;
  }, [form.dpi]);

  const { svgString, cells, rows, cols } = useMemo(() => {
    if (!validation.valid) {
      setError(validation.messages.join(' '));
      return { svgString: '', cells: [] as TestCardCell[], rows: 0, cols: 0 };
    }
    setError(null);

    const rows = form.stepsPower;
    const cols = form.stepsSpeed;

    const powerStep =
      rows > 1 ? (form.maxPower - form.minPower) / (rows - 1) : 0;
    const speedStep =
      cols > 1 ? (form.maxSpeed - form.minSpeed) / (cols - 1) : 0;

    const computedCells: TestCardCell[] = [];

    for (let row = 0; row < rows; row++) {
      const power = form.minPower + powerStep * row;
      for (let col = 0; col < cols; col++) {
        const speed = form.minSpeed + speedStep * col;
        computedCells.push({ rowIndex: row, colIndex: col, power, speed });
      }
    }

    const thicknessValue = parseFloat(form.thicknessMm);

    const svgString = generateTestCardSvg({
      materialName: form.materialName,
      thicknessMm: Number.isNaN(thicknessValue) ? undefined : thicknessValue,
      dpi: form.dpi,
      rows,
      cols,
      cells: computedCells,
      // Slightly larger base cells so SVG is readable even at 100%
      cellWidth: 24,
      cellHeight: 24,
      padding: 10,
      patternType: form.patternType ?? 'gradientDetail',
      photoSampleDataUrl:
        hasPhotoSample && processedImageInfo?.sampleDataUrl
          ? processedImageInfo.sampleDataUrl
          : undefined,
    });

    return { svgString, cells: computedCells, rows, cols };
  }, [form, validation, hasPhotoSample, processedImageInfo]);

  const handleDownloadSvg = () => {
    if (!svgString || !validation.valid) return;

    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = slugify(form.materialName);
    link.href = url;
    link.download = `test-card-${safeName}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadSvgVectorOnly = () => {
    if (!validation.valid || !cells.length) return;

    const thicknessValue = parseFloat(form.thicknessMm);
    const thicknessMm = Number.isNaN(thicknessValue) ? undefined : thicknessValue;

    // Force a purely vector SVG by using the gradient/detail pattern and
    // omitting the photo sample image layer.
    const svgVector = generateTestCardSvg({
      materialName: form.materialName,
      thicknessMm,
      dpi: form.dpi,
      rows,
      cols,
      cells,
      cellWidth: CELL_WIDTH_MM,
      cellHeight: CELL_HEIGHT_MM,
      padding: PADDING_MM,
      patternType: 'gradientDetail',
    });

    const blob = new Blob([svgVector], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = slugify(form.materialName);
    link.href = url;
    link.download = `test-card-${safeName}-vector.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPngForLightBurn = async () => {
    if (form.patternType !== 'photoSample') return;
    if (!validation.valid || !cells.length) return;
    if (!processedImage) return;

    const thicknessValue = parseFloat(form.thicknessMm);
    const thicknessMm = Number.isNaN(thicknessValue) ? undefined : thicknessValue;

    const cfg: PhotoSampleTestCardConfig = {
      materialName: form.materialName,
      thicknessMm,
      dpi: form.dpi,
      rows,
      cols,
      cells,
      cellWidthMm: CELL_WIDTH_MM,
      cellHeightMm: CELL_HEIGHT_MM,
      paddingMm: PADDING_MM,
      titleHeightMm: TITLE_HEIGHT_MM,
    };

    const blob = await generatePhotoSampleTestCardPng(cfg, processedImage);
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = slugify(form.materialName);
    link.href = url;
    link.download = `test-card-photo-${safeName}-${form.dpi}dpi.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Left: Form */}
      <div className="w-full lg:w-80 xl:w-96 bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-4 flex-shrink-0">
        <h2 className="text-lg font-semibold text-white mb-1">Test Card Generator</h2>
        <p className="text-xs text-gray-400 mb-2">
          Generate a power vs speed calibration grid as an SVG file you can import into LightBurn.
        </p>

        {/* Material */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-300">Material Name</label>
          <input
            type="text"
            value={form.materialName}
            onChange={handleStringChange('materialName')}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
            placeholder="e.g. Plywood, Slate"
          />
        </div>

        {/* Pattern type */}
        <div className="space-y-2 border-t border-gray-700 pt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-300">Pattern</span>
          </div>
          <div className="flex flex-col gap-1 text-[11px] text-gray-300">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="patternType"
                value="solid"
                checked={form.patternType === 'solid'}
                onChange={() => handlePatternChange('solid')}
                className="h-3 w-3 text-blue-500 border-gray-600 bg-gray-900"
              />
              <span>Solid block</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="patternType"
                value="gradientDetail"
                checked={form.patternType === 'gradientDetail'}
                onChange={() => handlePatternChange('gradientDetail')}
                className="h-3 w-3 text-blue-500 border-gray-600 bg-gray-900"
              />
              <span>Gradient + details (recommended)</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="patternType"
                value="photoSample"
                checked={form.patternType === 'photoSample'}
                onChange={() => handlePatternChange('photoSample')}
                disabled={!hasPhotoSample}
                className="h-3 w-3 text-blue-500 border-gray-600 bg-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"
              />
              <span className={!hasPhotoSample ? 'text-gray-500' : ''}>
                Current photo sample
              </span>
            </label>
          </div>
          {!hasPhotoSample && (
            <div className="text-[11px] text-yellow-300 bg-yellow-900/30 border border-yellow-700 rounded px-2 py-1 mt-1">
              No processed photo available. Go to the Photo Prep tab, upload and process a photo, then return here.
            </div>
          )}
          {hasPhotoSample && (
            <p className="text-[11px] text-gray-500 mt-1">
              When using <span className="text-gray-200 font-medium">Current photo sample</span>, the same
              processed photo snippet is used in each cell, but engraved at different power/speed combinations
              so you can see which combo works best for this specific image.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-300">Thickness (mm, optional)</label>
          <input
            type="number"
            value={form.thicknessMm}
            onChange={handleStringChange('thicknessMm')}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
            placeholder="e.g. 3.0"
            min={0}
            step={0.1}
          />
        </div>

        {/* Power range */}
        <div className="space-y-2 border-t border-gray-700 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-300">Power (%)</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <label className="block text-[11px] text-gray-400">Min</label>
              <input
                type="number"
                value={form.minPower}
                onChange={handleNumberChange('minPower')}
                className="w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-xs text-white focus:outline-none focus:border-blue-500"
                min={0}
                max={100}
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-400">Max</label>
              <input
                type="number"
                value={form.maxPower}
                onChange={handleNumberChange('maxPower')}
                className="w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-xs text-white focus:outline-none focus:border-blue-500"
                min={0}
                max={100}
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-400">Steps</label>
              <input
                type="number"
                value={form.stepsPower}
                onChange={handleNumberChange('stepsPower')}
                className="w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-xs text-white focus:outline-none focus:border-blue-500"
                min={2}
                max={20}
              />
            </div>
          </div>
        </div>

        {/* Speed range */}
        <div className="space-y-2 border-t border-gray-700 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-300">Speed (units)</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <label className="block text-[11px] text-gray-400">Min</label>
              <input
                type="number"
                value={form.minSpeed}
                onChange={handleNumberChange('minSpeed')}
                className="w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-xs text-white focus:outline-none focus:border-blue-500"
                min={0}
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-400">Max</label>
              <input
                type="number"
                value={form.maxSpeed}
                onChange={handleNumberChange('maxSpeed')}
                className="w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-xs text-white focus:outline-none focus:border-blue-500"
                min={0}
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-400">Steps</label>
              <input
                type="number"
                value={form.stepsSpeed}
                onChange={handleNumberChange('stepsSpeed')}
                className="w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-xs text-white focus:outline-none focus:border-blue-500"
                min={2}
                max={20}
              />
            </div>
          </div>
        </div>

        {/* DPI + LightBurn helper */}
        <div className="space-y-2 border-t border-gray-700 pt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-300">DPI</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={form.dpi}
              onChange={handleNumberChange('dpi')}
              className="w-28 px-2 py-1 bg-gray-900 border border-gray-700 rounded text-xs text-white focus:outline-none focus:border-blue-500"
              min={1}
            />
            {lineIntervalMm && (
              <div className="flex-1 text-[11px] text-gray-400 flex items-center gap-1">
                <Info className="w-3 h-3 text-blue-400" />
                <span>
                  Line interval: <span className="font-mono text-blue-300">{lineIntervalMm.toFixed(3)} mm</span>
                  {" "}– use as LightBurn line interval / scan gap.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Validation errors */}
        {error && (
          <div className="mt-2 text-[11px] text-red-300 bg-red-900/40 border border-red-700 rounded px-2 py-1">
            {error}
          </div>
        )}

        {/* Download buttons */}
        {form.patternType !== 'photoSample' ? (
          <>
            <button
              onClick={handleDownloadSvg}
              disabled={!validation.valid || !svgString}
              className={`mt-3 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors ${
                validation.valid && svgString
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Download className="w-4 h-4" />
              Download SVG
            </button>

            <p className="text-[11px] text-gray-500 mt-1">
              SVG is unit-agnostic. You can scale it in LightBurn to match your desired size.
            </p>
          </>
        ) : (
          <>
            <button
              onClick={handleDownloadPngForLightBurn}
              disabled={!validation.valid || !cells.length || !processedImage}
              className={`mt-3 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors ${
                validation.valid && cells.length && processedImage
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Download className="w-4 h-4" />
              Download PNG for LightBurn
            </button>

            <button
              type="button"
              onClick={handleDownloadSvgVectorOnly}
              disabled={!validation.valid || !cells.length}
              className={`mt-2 w-full inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                validation.valid && cells.length
                  ? 'border-gray-500 text-gray-100 hover:bg-gray-800'
                  : 'border-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              Download SVG (vector only)
            </button>

            <p className="text-[11px] text-gray-500 mt-1">
              LightBurn does not reliably import embedded images from SVG, so in
              <span className="text-gray-200 font-medium"> Current photo sample </span>
              mode the main export is a PNG bitmap. You can still download a vector-only SVG grid if you prefer.
            </p>
          </>
        )}
      </div>

      {/* Right: Preview */}
      <div className="flex-1 bg-gray-900 border border-gray-700 rounded-lg p-3 flex flex-col min-h-[260px]">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-sm font-semibold text-white">Preview</h3>
            <p className="text-[11px] text-gray-400">Live SVG preview of the generated test card.</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-3">
              <div className="text-[11px] text-gray-500">
                Cells: <span className="font-mono text-gray-300">{cells.length}</span>
              </div>
              <div className="inline-flex rounded bg-gray-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setPreviewScale(1)}
                  className={`px-2 py-1 rounded-l transition-colors ${
                    previewScale === 1
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  100%
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewScale(1.5)}
                  className={`px-2 py-1 transition-colors ${
                    previewScale === 1.5
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  150%
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewScale(2)}
                  className={`px-2 py-1 rounded-r transition-colors ${
                    previewScale === 2
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  200%
                </button>
              </div>
            </div>

            {/* Continuous zoom slider: 50% - 400% */}
            <div className="flex items-center gap-2 text-[11px] text-gray-400">
              <span className="whitespace-nowrap">Zoom {Math.round(previewScale * 100)}%</span>
              <input
                type="range"
                min={0.5}
                max={4}
                step={0.1}
                value={previewScale}
                onChange={(e) => setPreviewScale(parseFloat(e.target.value))}
                className="w-32 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer
                           [&::-webkit-slider-thumb]:appearance-none
                           [&::-webkit-slider-thumb]:w-3
                           [&::-webkit-slider-thumb]:h-3
                           [&::-webkit-slider-thumb]:bg-blue-500
                           [&::-webkit-slider-thumb]:rounded-full
                           [&::-webkit-slider-thumb]:cursor-pointer
                           [&::-moz-range-thumb]:w-3
                           [&::-moz-range-thumb]:h-3
                           [&::-moz-range-thumb]:bg-blue-500
                           [&::-moz-range-thumb]:rounded-full
                           [&::-moz-range-thumb]:border-0
                           [&::-moz-range-thumb]:cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 bg-black/40 rounded flex items-center justify-center overflow-auto">
          {validation.valid && svgString ? (
            <div
              className="inline-block max-w-full max-h-full"
              style={{
                transform: `scale(${previewScale})`,
                transformOrigin: 'center',
              }}
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: svgString }}
            />
          ) : (
            <div className="text-xs text-gray-500 text-center px-4">
              Enter valid ranges for Power and Speed to see the preview.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

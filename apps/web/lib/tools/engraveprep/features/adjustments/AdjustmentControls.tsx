/**
 * AdjustmentControls Component
 * 
 * Sliders and toggles for image adjustments:
 * - Grayscale, Brightness, Contrast, Gamma, Invert, Mirror
 * - Easy Mode toggle (hides manual controls when enabled)
 */

import { Sun, Contrast as ContrastIcon, Palette, FlipHorizontal } from 'lucide-react';
import { useImageStore } from '../../store/useImageStore';
import { EasyModeControls } from './EasyModeControls';

export function AdjustmentControls() {
  const { adjustments, setAdjustments, easyMode } = useImageStore();

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
        <Sun className="w-4 h-4" />
        Adjustments
      </h3>

      {/* Easy Mode Controls */}
      <EasyModeControls />

      {/* Manual controls (hidden when Easy Mode is ON) */}
      {!easyMode && (<>

      {/* Grayscale */}
      <div className="flex items-center justify-between">
        <label className="text-sm text-gray-300 flex items-center gap-2">
          <Palette className="w-4 h-4" />
          Grayscale
        </label>
        <button
          onClick={() => setAdjustments({ grayscale: !adjustments.grayscale })}
          className={`w-11 h-6 rounded-full transition-colors ${
            adjustments.grayscale ? 'bg-blue-600' : 'bg-gray-600'
          }`}
        >
          <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
            adjustments.grayscale ? 'translate-x-5' : 'translate-x-0.5'
          }`} />
        </button>
      </div>

      {/* Brightness */}
      <SliderControl
        label="Brightness"
        icon={<Sun className="w-4 h-4" />}
        value={adjustments.brightness}
        min={-100}
        max={100}
        onChange={(v) => setAdjustments({ brightness: v })}
      />

      {/* Contrast */}
      <SliderControl
        label="Contrast"
        icon={<ContrastIcon className="w-4 h-4" />}
        value={adjustments.contrast}
        min={-100}
        max={100}
        onChange={(v) => setAdjustments({ contrast: v })}
      />

      {/* Gamma */}
      <SliderControl
        label="Gamma"
        icon={<Sun className="w-4 h-4" />}
        value={adjustments.gamma}
        min={0.2}
        max={3}
        step={0.1}
        onChange={(v) => setAdjustments({ gamma: v })}
      />

      {/* Invert */}
      <div className="flex items-center justify-between">
        <label className="text-sm text-gray-300">Invert Colors</label>
        <button
          onClick={() => setAdjustments({ invert: !adjustments.invert })}
          className={`w-11 h-6 rounded-full transition-colors ${
            adjustments.invert ? 'bg-blue-600' : 'bg-gray-600'
          }`}
        >
          <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
            adjustments.invert ? 'translate-x-5' : 'translate-x-0.5'
          }`} />
        </button>
      </div>

      {/* Mirror Horizontal */}
      <div className="flex items-center justify-between">
        <label className="text-sm text-gray-300 flex items-center gap-2">
          <FlipHorizontal className="w-4 h-4" />
          Mirror Horizontal
        </label>
        <button
          onClick={() => setAdjustments({ mirrorHorizontal: !adjustments.mirrorHorizontal })}
          className={`w-11 h-6 rounded-full transition-colors ${
            adjustments.mirrorHorizontal ? 'bg-blue-600' : 'bg-gray-600'
          }`}
        >
          <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
            adjustments.mirrorHorizontal ? 'translate-x-5' : 'translate-x-0.5'
          }`} />
        </button>
      </div>
      </>)}
    </div>
  );
}

interface SliderControlProps {
  label: string;
  icon: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}

function SliderControl({ label, icon, value, min, max, step = 1, onChange }: SliderControlProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm text-gray-300 flex items-center gap-2">
          {icon}
          {label}
        </label>
        <span className="text-sm text-gray-400 font-mono w-12 text-right">
          {step < 1 ? value.toFixed(1) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer
                   [&::-webkit-slider-thumb]:appearance-none
                   [&::-webkit-slider-thumb]:w-4
                   [&::-webkit-slider-thumb]:h-4
                   [&::-webkit-slider-thumb]:bg-blue-500
                   [&::-webkit-slider-thumb]:rounded-full
                   [&::-webkit-slider-thumb]:cursor-pointer
                   [&::-moz-range-thumb]:w-4
                   [&::-moz-range-thumb]:h-4
                   [&::-moz-range-thumb]:bg-blue-500
                   [&::-moz-range-thumb]:rounded-full
                   [&::-moz-range-thumb]:border-0
                   [&::-moz-range-thumb]:cursor-pointer"
      />
    </div>
  );
}

/**
 * EngravePrep Help Content
 * Usage instructions for the laser engraving photo preparation tool
 */

export function EngravePrepHelp() {
  return (
    <div className="space-y-4 text-sm text-slate-300">
      <div>
        <h3 className="mb-2 font-semibold text-slate-100">How to Use EngravePrep</h3>
        <p className="text-slate-400">
          Prepare photos for laser engraving with optimized contrast, dithering, and sizing.
        </p>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">1. Upload Photo</h4>
        <p className="text-slate-400">
          Drag & drop or click to upload. JPG, PNG, or WebP formats supported.
        </p>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">2. Adjust Contrast & Levels</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li>Use <strong>Easy Mode</strong> for quick presets (1-5)</li>
          <li>Or adjust <strong>Brightness</strong>, <strong>Contrast</strong>, <strong>Gamma</strong> manually</li>
          <li>Try <strong>Material Presets</strong> for common materials (wood, acrylic, leather)</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">3. Choose Dithering</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>Floyd-Steinberg</strong>: Best for photos, smooth gradients</li>
          <li><strong>Atkinson</strong>: Lighter, faster engraving</li>
          <li><strong>None</strong>: Pure black & white threshold</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">4. Set Output Size</h4>
        <p className="text-slate-400">
          Adjust width/height in mm. DPI affects detail level (318 DPI recommended).
        </p>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">5. Export for LightBurn</h4>
        <p className="text-slate-400">
          Export as PNG or BMP. Import into LightBurn and set laser parameters.
        </p>
      </div>

      <div className="rounded-lg border border-blue-900 bg-blue-950/20 p-3">
        <h4 className="mb-1 font-medium text-blue-300">💡 Tips</h4>
        <ul className="ml-4 list-disc space-y-1 text-blue-200/80">
          <li>Start with <strong>300-600px width</strong> for testing</li>
          <li>Always test on scrap material first</li>
          <li>Adjust laser speed/power based on material</li>
          <li>Higher contrast = deeper engraving</li>
          <li>Use <strong>Invert</strong> for light-colored materials</li>
        </ul>
      </div>

      <div className="text-xs text-slate-500">
        <p>
          <strong>Recommended Settings:</strong> Wood (contrast +20-30), Acrylic (contrast +30-40), Leather (contrast +10-20)
        </p>
      </div>
    </div>
  );
}

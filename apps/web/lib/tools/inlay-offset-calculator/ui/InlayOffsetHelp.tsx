/**
 * Inlay Offset Calculator Help Content
 */

export function InlayOffsetHelp() {
  return (
    <div className="space-y-4 text-sm text-slate-300">
      <div>
        <h3 className="mb-2 font-semibold text-slate-100">What is Inlay / Marquetry?</h3>
        <p className="text-slate-400">
          Inlay is a decorative technique where a piece (inlay) fits precisely into a cutout (base). Used for marquetry, wood inlays, and decorative panels.
        </p>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Why Offset Calculation?</h4>
        <p className="text-slate-400 mb-2">
          Laser cutting removes material (kerf). To create a perfect fit, you must compensate for this material loss:
        </p>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>Inlay piece</strong>: Cut slightly LARGER (+offset outward)</li>
          <li><strong>Base cutout</strong>: Cut slightly SMALLER (-offset inward)</li>
          <li><strong>Formula</strong>: offset = kerf / 2 + extra clearance</li>
        </ul>
      </div>

      <div className="rounded-lg border border-blue-900 bg-blue-950/20 p-3">
        <h4 className="mb-1 font-medium text-blue-300">💡 How It Works</h4>
        <div className="space-y-2 text-blue-200/80">
          <p><strong>1. Base Offset</strong>: kerf ÷ 2 (e.g., 0.15mm ÷ 2 = 0.075mm)</p>
          <p><strong>2. Extra Clearance</strong>: Fine-tune fit (usually 0mm)</p>
          <p><strong>3. Positive Offset</strong>: +0.075mm (inlay piece expands)</p>
          <p><strong>4. Negative Offset</strong>: -0.075mm (base cutout shrinks)</p>
        </div>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Step-by-Step Process</h4>
        <ol className="ml-4 list-decimal space-y-1 text-slate-400">
          <li>Upload your design SVG (single closed path)</li>
          <li>Set material thickness and kerf</li>
          <li>Tool calculates offsets automatically</li>
          <li>Export positive (inlay) and negative (base) SVGs</li>
          <li>Cut both pieces on laser cutter</li>
          <li>Glue inlay into base cutout</li>
        </ol>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Kerf Values by Material</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>3mm Plywood (CO2)</strong>: ~0.15mm kerf</li>
          <li><strong>4mm Plywood (CO2)</strong>: ~0.18mm kerf</li>
          <li><strong>3mm Acrylic</strong>: ~0.20mm kerf</li>
          <li><strong>Fiber laser</strong>: ~0.05-0.10mm kerf (metal)</li>
          <li>Always test cut to verify your kerf!</li>
        </ul>
      </div>

      <div className="rounded-lg border border-amber-900 bg-amber-950/20 p-3">
        <h4 className="mb-1 font-medium text-amber-300">⚠️ Important Tips</h4>
        <ul className="ml-4 list-disc space-y-1 text-amber-200/80">
          <li><strong>Start with 0 extra clearance</strong> - adjust only if needed</li>
          <li><strong>Test cut first</strong> - verify fit before final project</li>
          <li><strong>Adjust ±0.05mm</strong> - if too tight or too loose</li>
          <li><strong>Negative clearance</strong> - creates tighter fit (risky)</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Assembly Tips</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li>Cut base first, then inlay (easier to adjust)</li>
          <li>Test fit before gluing (should be snug but not forced)</li>
          <li>Use wood glue for wood inlays</li>
          <li>Clamp or weight during drying</li>
          <li>Sand flush after glue dries</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Common Issues</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>Too tight</strong>: Increase extra clearance (+0.05mm)</li>
          <li><strong>Too loose</strong>: Decrease extra clearance (-0.05mm)</li>
          <li><strong>Gaps</strong>: Check kerf value, may be incorrect</li>
          <li><strong>Won&apos;t fit</strong>: Verify you cut positive and negative correctly</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Project Ideas</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>Wood marquetry</strong>: Decorative wood inlays</li>
          <li><strong>Cutting boards</strong>: Contrasting wood inlays</li>
          <li><strong>Wall art</strong>: Multi-layer inlay designs</li>
          <li><strong>Jewelry boxes</strong>: Decorative lid inlays</li>
          <li><strong>Coasters</strong>: Contrasting material insets</li>
        </ul>
      </div>

      <div className="text-xs text-slate-500">
        <p>
          <strong>Pro tip:</strong> For perfect fit, cut a test piece first with your exact material and laser settings. Measure the kerf, then adjust calculator values. This saves material and frustration!
        </p>
      </div>
    </div>
  );
}

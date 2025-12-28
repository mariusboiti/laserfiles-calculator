/**
 * Ornament/Nameplate Layout Planner Help Content
 */

export function OrnamentLayoutHelp() {
  return (
    <div className="space-y-4 text-sm text-slate-300">
      <div>
        <h3 className="mb-2 font-semibold text-slate-100">What is Ornament Layout Planner?</h3>
        <p className="text-slate-400">
          Upload an SVG template (ornament, tag, nameplate) and automatically arrange multiple copies on a laser cutter sheet. Perfect for batch production of decorative items.
        </p>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">How to Use</h4>
        <ol className="ml-4 list-decimal space-y-1 text-slate-400">
          <li>Upload your SVG template (single ornament/tag)</li>
          <li>Set sheet size (laser bed dimensions)</li>
          <li>Configure margins and gaps</li>
          <li>Enable auto-fit or set manual rows/cols</li>
          <li>Export sheet layout SVG for laser cutting</li>
        </ol>
      </div>

      <div className="rounded-lg border border-blue-900 bg-blue-950/20 p-3">
        <h4 className="mb-1 font-medium text-blue-300">💡 Recommended Settings</h4>
        <ul className="ml-4 list-disc space-y-1 text-blue-200/80">
          <li><strong>Margin</strong>: 3-5mm from sheet edge (safety zone)</li>
          <li><strong>Gaps</strong>: 2-4mm between items (cutting clearance)</li>
          <li><strong>Auto-fit</strong>: Let tool calculate optimal rows/cols</li>
          <li><strong>Center</strong>: Enable for balanced layout</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Auto-Fit Explained</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>Enabled</strong>: Automatically calculates max rows/cols that fit</li>
          <li><strong>Disabled</strong>: Manually set rows/cols (may overflow)</li>
          <li>Auto-fit maximizes material usage</li>
          <li>Considers margins, gaps, and template size</li>
          <li>Shows warnings if layout exceeds sheet</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">SVG Template Tips</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li>Template should be a single ornament/tag</li>
          <li>Include viewBox for best results</li>
          <li>Tool preserves original SVG (no modifications)</li>
          <li>Supports mm, px, in, cm units</li>
          <li>Test with one template before batch cutting</li>
        </ul>
      </div>

      <div className="rounded-lg border border-amber-900 bg-amber-950/20 p-3">
        <h4 className="mb-1 font-medium text-amber-300">⚠️ Important Notes</h4>
        <ul className="ml-4 list-disc space-y-1 text-amber-200/80">
          <li>Template larger than sheet will show error</li>
          <li>Overflow warnings mean layout exceeds sheet</li>
          <li>Too many rows/cols may cause overlap</li>
          <li>Test cut one sheet before large batches</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Use Cases</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>Christmas Ornaments</strong>: Batch cut decorations</li>
          <li><strong>Gift Tags</strong>: Multiple tags per sheet</li>
          <li><strong>Nameplates</strong>: Repeated name/logo plates</li>
          <li><strong>Wedding Favors</strong>: Personalized tokens</li>
          <li><strong>Product Tags</strong>: Inventory labels</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Material Tips</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>Wood</strong>: 3mm plywood for ornaments</li>
          <li><strong>Acrylic</strong>: 3mm clear or colored</li>
          <li><strong>Cardstock</strong>: Laser-safe cardstock for tags</li>
          <li>Ensure material fits your laser bed size</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Laser Settings</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li>Cut all items in one pass for consistency</li>
          <li>Use same power/speed for all copies</li>
          <li>Test settings on scrap first</li>
          <li>Consider kerf compensation if needed</li>
        </ul>
      </div>

      <div className="text-xs text-slate-500">
        <p>
          <strong>Pro tip:</strong> For Christmas ornaments, use 3mm plywood and batch cut 20-50 per sheet. Add hanging holes to your template before uploading!
        </p>
      </div>
    </div>
  );
}

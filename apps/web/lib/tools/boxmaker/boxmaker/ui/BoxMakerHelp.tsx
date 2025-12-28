/**
 * BoxMaker Help Content
 * Assembly tips, kerf guidance, and mode explanations
 */

export function BoxMakerHelp() {
  return (
    <div className="space-y-4 text-sm text-slate-300">
      <div>
        <h3 className="mb-2 font-semibold text-slate-100">BoxMaker Modes</h3>
        <p className="text-slate-400">
          Three box types for different needs: Simple, Hinged, and Sliding Drawer.
        </p>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Simple Box</h4>
        <p className="text-slate-400">
          Basic finger-jointed box with optional lid. Best for storage, organizers, and quick projects.
        </p>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Hinged Box</h4>
        <p className="text-slate-400">
          Box with integrated living hinge on the lid. Requires a rod/pin through hinge holes. Great for jewelry boxes and presentation cases.
        </p>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Sliding Drawer Box</h4>
        <p className="text-slate-400">
          Outer shell with sliding drawer. Optional decorative front face. Perfect for desk organizers and storage solutions.
        </p>
      </div>

      <div className="rounded-lg border border-blue-900 bg-blue-950/20 p-3">
        <h4 className="mb-1 font-medium text-blue-300">🔧 Assembly Tips</h4>
        <ul className="ml-4 list-disc space-y-1 text-blue-200/80">
          <li>Dry-fit all panels before gluing</li>
          <li>Use wood glue on finger joints for strength</li>
          <li>Clamp panels square while glue dries</li>
          <li>For hinged boxes: insert rod/pin after assembly</li>
          <li>Sand edges smooth before assembly</li>
        </ul>
      </div>

      <div className="rounded-lg border border-amber-900 bg-amber-950/20 p-3">
        <h4 className="mb-1 font-medium text-amber-300">📏 Kerf Compensation</h4>
        <ul className="ml-4 list-disc space-y-1 text-amber-200/80">
          <li><strong>Kerf</strong> = width of laser cut (material removed)</li>
          <li>Typical values: 0.1-0.2mm for wood, 0.15-0.25mm for acrylic</li>
          <li>Test on scrap material first</li>
          <li>Adjust kerf if joints are too tight or loose</li>
          <li>Higher power = wider kerf</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">📐 Material Thickness</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>3mm</strong>: Standard for small-medium boxes (plywood, MDF, acrylic)</li>
          <li><strong>4-6mm</strong>: Larger boxes, more structural strength</li>
          <li><strong>Measure actual thickness</strong> - nominal sizes vary</li>
          <li>Thicker material = stronger box but larger finger joints</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">🎯 Recommended Starting Points</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>Small box</strong>: 80×60×40mm, 3mm material, 0.15mm kerf</li>
          <li><strong>Medium box</strong>: 120×80×60mm, 3mm material, 0.15mm kerf</li>
          <li><strong>Large box</strong>: 200×150×100mm, 4mm material, 0.18mm kerf</li>
          <li>Use presets for quick start, then adjust</li>
        </ul>
      </div>

      <div className="text-xs text-slate-500">
        <p>
          <strong>Pro tip:</strong> Export all panels to ZIP, import into LightBurn, arrange on your bed size, and cut!
        </p>
      </div>
    </div>
  );
}

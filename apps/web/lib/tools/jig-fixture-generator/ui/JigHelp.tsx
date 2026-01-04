/**
 * Jig & Fixture Generator Help Content
 */

export function JigHelp() {
  return (
    <div className="space-y-4 text-sm text-slate-300">
      <div>
        <h3 className="mb-2 font-semibold text-slate-100">What is a Jig / Fixture?</h3>
        <p className="text-slate-400">
          A jig is a template with cutouts that holds parts in precise positions for repeatable engraving, assembly, or production. Essential for batch work and consistent results.
        </p>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Use Cases</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>Batch Engraving</strong>: Hold multiple items for consistent engraving</li>
          <li><strong>Assembly Jigs</strong>: Position parts for gluing or assembly</li>
          <li><strong>Production Fixtures</strong>: Repeatable manufacturing setups</li>
          <li><strong>Alignment Templates</strong>: Precise positioning guides</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">How to Use</h4>
        <ol className="ml-4 list-decimal space-y-1 text-slate-400">
          <li>Set bed size (your laser cutter dimensions)</li>
          <li>Define object size (item to be held)</li>
          <li>Set rows, cols, and gaps</li>
          <li>Enable numbering for tracking (optional)</li>
          <li>Export SVG and cut jig from MDF/plywood</li>
          <li>Place items in cutouts for batch processing</li>
        </ol>
      </div>

      <div className="rounded-lg border border-blue-900 bg-blue-950/20 p-3">
        <h4 className="mb-1 font-medium text-blue-300">💡 Recommended Settings</h4>
        <ul className="ml-4 list-disc space-y-1 text-blue-200/80">
          <li><strong>Margin</strong>: 3-5mm from bed edge (safety zone)</li>
          <li><strong>Gaps</strong>: 6-10mm between objects (structural strength)</li>
          <li><strong>Material</strong>: 3-6mm MDF or plywood for jig</li>
          <li><strong>Numbering</strong>: Enable for tracking position order</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Hole Mode Options</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>Cut</strong>: Full cutout (items drop through)</li>
          <li><strong>Engrave</strong>: Shallow guide marks (items rest on top)</li>
          <li>Cut mode is most common for holding jigs</li>
          <li>Engrave mode useful for alignment guides</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Numbering Feature</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li>Engraves numbers (1, 2, 3...) in each cutout</li>
          <li>Helps track position order for batch work</li>
          <li>Useful for assembly sequences</li>
          <li>Numbers are engraved, not cut</li>
        </ul>
      </div>

      <div className="rounded-lg border border-amber-900 bg-amber-950/20 p-3">
        <h4 className="mb-1 font-medium text-amber-300">⚠️ Important Tips</h4>
        <ul className="ml-4 list-disc space-y-1 text-amber-200/80">
          <li>Test first jig with scrap material (MDF recommended)</li>
          <li>Add 0.5-1mm clearance to object size for easy fit</li>
          <li>Keep gaps ≥6mm for structural strength</li>
          <li>Margin ≥3mm prevents edge breakage</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Material Recommendations</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>MDF 3-6mm</strong>: Cheap, stable, easy to cut (best for jigs)</li>
          <li><strong>Plywood 3-6mm</strong>: Stronger, more durable</li>
          <li><strong>Acrylic 3-5mm</strong>: Transparent (see-through alignment)</li>
          <li>Avoid thin materials (&lt;3mm) - too fragile</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Production Workflow</h4>
        <ol className="ml-4 list-decimal space-y-1 text-slate-400">
          <li>Cut jig from MDF (one-time setup)</li>
          <li>Place items in cutouts</li>
          <li>Engrave/mark all items in one pass</li>
          <li>Remove items, repeat with next batch</li>
          <li>Reuse jig for hundreds of items</li>
        </ol>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Example Projects</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>Coaster Engraving</strong>: Hold 12 coasters for batch engraving</li>
          <li><strong>Keychain Production</strong>: Position 20 keychains precisely</li>
          <li><strong>Badge Alignment</strong>: Consistent name badge engraving</li>
          <li><strong>Assembly Jig</strong>: Hold parts for gluing/assembly</li>
        </ul>
      </div>

      <div className="text-xs text-slate-500">
        <p>
          <strong>Pro tip:</strong> For batch engraving, add 0.5mm to object size for easy insertion/removal. Number the cutouts to track which items have been processed. Reuse jigs for hundreds of items!
        </p>
      </div>
    </div>
  );
}

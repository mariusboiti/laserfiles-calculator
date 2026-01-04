/**
 * Keychain Generator V2 Help Content
 * Usage instructions for creating laser-cut keychains
 */

export function KeychainHelp() {
  return (
    <div className="space-y-4 text-sm text-slate-300">
      <div>
        <h3 className="mb-2 font-semibold text-slate-100">Keychain Generator V2</h3>
        <p className="text-slate-400">
          Create custom laser-cut keychains with shapes, mounting holes, and engraved text. V2 adds real text measurement, slot/double holes, batch mode, multi-layer export, and preset management.
        </p>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">How to Use</h4>
        <ol className="ml-4 list-decimal space-y-1 text-slate-400">
          <li>Choose a shape (rounded rectangle, circle, dog tag, etc.)</li>
          <li>Set dimensions (width × height)</li>
          <li>Configure hole type (circle, slot, or double)</li>
          <li>Enter text (1 or 2 lines)</li>
          <li>Choose render mode (cut+engrave, cut-only, engrave-only)</li>
          <li>Export SVG for laser cutting</li>
        </ol>
      </div>

      <div className="rounded-lg border border-blue-900 bg-blue-950/20 p-3">
        <h4 className="mb-1 font-medium text-blue-300">💡 Recommended Sizes</h4>
        <ul className="ml-4 list-disc space-y-1 text-blue-200/80">
          <li><strong>Standard keychain</strong>: 70×25mm or 80×30mm</li>
          <li><strong>Round tag</strong>: 35×35mm (circle)</li>
          <li><strong>Dog tag</strong>: 80×35mm</li>
          <li><strong>Text length</strong>: Keep under 12-15 characters for small sizes</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Hole Configuration</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>Circle</strong>: 5mm diameter (fits keyring)</li>
          <li><strong>Slot</strong>: Oval hole for straps/ribbons (7×4mm typical)</li>
          <li><strong>Double</strong>: Two holes for dog-tag style chains</li>
          <li><strong>Web thickness</strong>: Keep ≥2mm from hole edge to shape edge</li>
          <li><strong>Margin</strong>: 4mm from edge (minimum recommended)</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Text Engraving</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>Auto-fit</strong>: Text scales to fit available space</li>
          <li><strong>Hole-safe</strong>: Text avoids hole area automatically</li>
          <li><strong>Font size</strong>: 8-22pt range for readability</li>
          <li><strong>Bold text</strong>: Recommended for small keychains</li>
          <li>Text is engraved, not cut through</li>
        </ul>
      </div>

      <div className="rounded-lg border border-amber-900 bg-amber-950/20 p-3">
        <h4 className="mb-1 font-medium text-amber-300">⚠️ Important Notes</h4>
        <ul className="ml-4 list-disc space-y-1 text-amber-200/80">
          <li>Very small keychains (&lt;20mm) may be fragile</li>
          <li>Long text will shrink to minimum font size</li>
          <li>Test cut on scrap material first</li>
          <li>Adjust laser power for engraving vs cutting</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Material Tips</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>Acrylic</strong>: 3mm clear or colored (durable, modern)</li>
          <li><strong>Wood</strong>: 3-4mm plywood (classic, warm look)</li>
          <li><strong>Leather</strong>: 2-3mm vegetable tanned (flexible)</li>
          <li><strong>MDF</strong>: 3mm for prototypes (cheap, easy to cut)</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Laser Settings</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>Cutting</strong>: High power, slow speed (outline + hole)</li>
          <li><strong>Engraving</strong>: Medium power, fast speed (text)</li>
          <li>Set text as separate layer in LightBurn</li>
          <li>Test settings on scrap before final cut</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Finishing Tips</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li>Sand edges smooth after cutting</li>
          <li>Apply clear coat for protection (wood)</li>
          <li>Polish acrylic edges with flame or sandpaper</li>
          <li>Add keyring through 5mm hole</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">V2 Features</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>Render Modes</strong>: Cut+Engrave, Cut-only, Engrave-only</li>
          <li><strong>Multi-export</strong>: Download combined, cut, or engrave layers</li>
          <li><strong>Batch mode</strong>: Generate multiple keychains from a list</li>
          <li><strong>Presets</strong>: Save and load your favorite configurations</li>
          <li><strong>QA Panel</strong>: Auto-fix common issues with one click</li>
          <li><strong>Two-line text</strong>: Add name + subtitle on keychains</li>
        </ul>
      </div>

      <div className="rounded-lg border border-green-900 bg-green-950/20 p-3">
        <h4 className="mb-1 font-medium text-green-300">✓ Production Tips</h4>
        <ul className="ml-4 list-disc space-y-1 text-green-200/80">
          <li><strong>Web thickness</strong>: Maintain ≥2mm between hole and edge</li>
          <li><strong>Slot holes</strong>: Use height ≥3mm for durability</li>
          <li><strong>Font size</strong>: 10pt minimum for readability on wood</li>
          <li><strong>Test first</strong>: Always test on scrap material</li>
        </ul>
      </div>

      <div className="text-xs text-slate-500">
        <p>
          <strong>Pro tip:</strong> Use batch mode to generate multiple keychains with different names. Export as a sheet for efficient cutting!
        </p>
      </div>
    </div>
  );
}

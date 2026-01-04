/**
 * Personalised Sign Generator V3 PRO Help Content
 * Usage instructions for layer-based sign designer
 */

export function PersonalisedSignHelpPro() {
  return (
    <div className="space-y-4 text-sm text-slate-300">
      <div>
        <h3 className="mb-2 font-semibold text-slate-100">Personalised Sign Generator V3 PRO</h3>
        <p className="text-slate-400">
          Create professional laser-cut signs with layers, AI generation, text-to-path conversion, and cut/engrave modes. Perfect for family signs, workshop plaques, and decorative pieces.
        </p>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">How to Use</h4>
        <ol className="ml-4 list-decimal space-y-1 text-slate-400">
          <li>Choose a shape and set dimensions</li>
          <li>Add text elements with font, size, and mode selection</li>
          <li>Use AI to generate sketches or silhouettes</li>
          <li>Manage layers for organization</li>
          <li>Export SVG with grouped CUT/ENGRAVE layers</li>
        </ol>
      </div>

      <div className="rounded-lg border border-blue-900 bg-blue-950/20 p-3">
        <h4 className="mb-1 font-medium text-blue-300">📐 Text Modes</h4>
        <ul className="ml-4 list-disc space-y-1 text-blue-200/80">
          <li><strong>Engrave (Filled)</strong>: Text is engraved/burned - uses ENGRAVE layer (red)</li>
          <li><strong>Cut (Outline)</strong>: Text is cut through - uses CUT layer (black)</li>
          <li><strong>Both</strong>: Engrave filled + cut outline for standout effect</li>
          <li><strong>Outline Offset</strong>: Add extra cut outline around text (goes to OUTLINE layer)</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Layers System</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>BASE</strong>: The sign outline shape (always CUT)</li>
          <li><strong>CUT</strong>: Elements to cut through (black stroke)</li>
          <li><strong>ENGRAVE</strong>: Elements to engrave (red stroke)</li>
          <li><strong>OUTLINE</strong>: Text outline offsets (black stroke)</li>
          <li><strong>GUIDE</strong>: Preview-only guides (not exported)</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Layer Controls</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>Eye icon</strong>: Toggle visibility (preview only)</li>
          <li><strong>Lock icon</strong>: Lock layer to prevent editing</li>
          <li><strong>Opacity</strong>: Adjust preview opacity (export ignores this)</li>
          <li><strong>Export toggle</strong>: Include/exclude from export</li>
          <li><strong>Reorder</strong>: Change layer stacking order</li>
        </ul>
      </div>

      <div className="rounded-lg border border-purple-900 bg-purple-950/20 p-3">
        <h4 className="mb-1 font-medium text-purple-300">✨ AI Generation</h4>
        <ul className="ml-4 list-disc space-y-1 text-purple-200/80">
          <li><strong>Engraving Sketch</strong>: Line-art for engraving (stroke-based)</li>
          <li><strong>Shape Silhouette</strong>: Solid shape for cutting (fill-based)</li>
          <li>Keep prompts simple: &quot;deer in forest&quot;, &quot;boho rainbow&quot;, &quot;mountain sunset&quot;</li>
          <li>AI results are added to the appropriate layer automatically</li>
          <li>Detail level controls complexity of generated art</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Shared Fonts</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li>130+ fonts from Keychain Hub tool</li>
          <li>Script, serif, sans, display, and handwritten styles</li>
          <li>Search fonts by name</li>
          <li>Fonts are converted to paths for laser compatibility</li>
        </ul>
      </div>

      <div className="rounded-lg border border-amber-900 bg-amber-950/20 p-3">
        <h4 className="mb-1 font-medium text-amber-300">⚠️ Important Notes</h4>
        <ul className="ml-4 list-disc space-y-1 text-amber-200/80">
          <li>Opacity is preview-only - export is always 100%</li>
          <li>GUIDE layer is never exported</li>
          <li>CUT layer = cut through (black/hairline)</li>
          <li>ENGRAVE layer = surface burn (red)</li>
          <li>Test on scrap material first</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Export Format</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li>SVG with grouped layers: CUT, OUTLINE, ENGRAVE</li>
          <li>Groups have IDs matching layer names</li>
          <li>Stroke widths configurable in Output Settings</li>
          <li>No guides, opacity, or preview elements</li>
          <li>Compatible with LightBurn, LaserGRBL, etc.</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Laser Settings Tip</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>CUT (black)</strong>: High power, slow speed</li>
          <li><strong>ENGRAVE (red)</strong>: Medium power, fast speed</li>
          <li>Import SVG and assign layers by color</li>
          <li>CUT should be processed last</li>
        </ul>
      </div>

      <div className="text-xs text-slate-500">
        <p>
          <strong>Pro tip:</strong> Use the Guides toggle to see safe zones while designing, then disable before exporting for a clean file.
        </p>
      </div>
    </div>
  );
}

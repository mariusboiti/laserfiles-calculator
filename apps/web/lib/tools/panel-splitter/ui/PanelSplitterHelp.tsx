/**
 * Panel Splitter Help Content
 * Usage instructions for splitting large SVGs into laser-cuttable tiles
 */

export function PanelSplitterHelp() {
  return (
    <div className="space-y-4 text-sm text-slate-300">
      <div>
        <h3 className="mb-2 font-semibold text-slate-100">What is Panel Splitter?</h3>
        <p className="text-slate-400">
          Split large SVG designs into smaller tiles that fit your laser cutter bed. Perfect for wall art, mandalas, maps, and large decorative pieces.
        </p>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">How to Use</h4>
        <ol className="ml-4 list-decimal space-y-1 text-slate-400">
          <li>Upload your large SVG file</li>
          <li>Set your laser bed dimensions</li>
          <li>Adjust margin and overlap settings</li>
          <li>Click &quot;Generate Tiles&quot;</li>
          <li>Export as ZIP and cut each tile</li>
        </ol>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Assembly Tips</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li>Cut tiles in order (Row 1 Col 1, Row 1 Col 2, etc.)</li>
          <li>Use overlap to align pieces precisely</li>
          <li>Tape or glue tiles together from the back</li>
          <li>Mark tile numbers on the back before cutting</li>
          <li>Test fit before final assembly</li>
        </ul>
      </div>

      <div className="rounded-lg border border-blue-900 bg-blue-950/20 p-3">
        <h4 className="mb-1 font-medium text-blue-300">💡 Recommended Settings</h4>
        <ul className="ml-4 list-disc space-y-1 text-blue-200/80">
          <li><strong>Overlap</strong>: 0-1mm for precise alignment</li>
          <li><strong>Margin</strong>: 3-5mm minimum for safe cutting</li>
          <li><strong>Bed size</strong>: Measure your actual cutting area</li>
          <li>Use presets for common laser cutters</li>
        </ul>
      </div>

      <div className="rounded-lg border border-amber-900 bg-amber-950/20 p-3">
        <h4 className="mb-1 font-medium text-amber-300">⚠️ Important Notes</h4>
        <ul className="ml-4 list-disc space-y-1 text-amber-200/80">
          <li>Overlap creates duplicate cuts at tile edges</li>
          <li>Larger overlap = easier alignment but more waste</li>
          <li>Too many tiles (&gt;100) may slow down processing</li>
          <li>Test with small projects first</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Ideal For</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>Wall Art</strong>: Large decorative panels</li>
          <li><strong>Mandalas</strong>: Intricate circular designs</li>
          <li><strong>Maps</strong>: City maps, topographic designs</li>
          <li><strong>Signage</strong>: Large text or logos</li>
          <li><strong>Architectural Models</strong>: Building facades</li>
        </ul>
      </div>

      <div className="text-xs text-slate-500">
        <p>
          <strong>Pro tip:</strong> Export includes an assembly map showing tile arrangement. Print it as a reference during assembly!
        </p>
      </div>
    </div>
  );
}

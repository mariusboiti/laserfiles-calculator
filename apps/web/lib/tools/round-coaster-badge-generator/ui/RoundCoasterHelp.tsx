/**
 * Round Coaster & Badge Generator Help Content
 */

export function RoundCoasterHelp() {
  return (
    <div className="space-y-4 text-sm text-slate-300">
      <div>
        <h3 className="mb-2 font-semibold text-slate-100">What is Round Coaster & Badge Generator?</h3>
        <p className="text-slate-400">
          Create custom laser-cut coasters, badges, and decorative pieces with circle, hexagon, or shield shapes. Add engraved text and optional borders.
        </p>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Use Cases</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>Coasters</strong>: Drink coasters for home, cafe, events</li>
          <li><strong>Badges</strong>: Name badges, event tags, identification</li>
          <li><strong>Wedding Favors</strong>: Personalized gifts for guests</li>
          <li><strong>Decorative Pieces</strong>: Wall art, ornaments, tokens</li>
        </ul>
      </div>

      <div className="rounded-lg border border-blue-900 bg-blue-950/20 p-3">
        <h4 className="mb-1 font-medium text-blue-300">💡 Recommended Sizes</h4>
        <ul className="ml-4 list-disc space-y-1 text-blue-200/80">
          <li><strong>Standard coaster</strong>: 90-100mm diameter</li>
          <li><strong>Small badge</strong>: 60mm diameter</li>
          <li><strong>Large coaster</strong>: 120mm diameter</li>
          <li><strong>Hexagon coaster</strong>: 100mm width</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Border Options</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>Single border</strong>: Clean outline around edge</li>
          <li><strong>Double border</strong>: Two concentric circles/shapes</li>
          <li><strong>Border inset</strong>: 3mm standard (distance from edge)</li>
          <li>Borders are cut, text is engraved</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Text Layout</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>Top line</strong>: Small text (optional)</li>
          <li><strong>Center line</strong>: Main text (larger, bold)</li>
          <li><strong>Bottom line</strong>: Small text (optional)</li>
          <li><strong>Auto-fit</strong>: Text scales to fit available space</li>
          <li>Empty lines are skipped automatically</li>
        </ul>
      </div>

      <div className="rounded-lg border border-amber-900 bg-amber-950/20 p-3">
        <h4 className="mb-1 font-medium text-amber-300">⚠️ Important Notes</h4>
        <ul className="ml-4 list-disc space-y-1 text-amber-200/80">
          <li>Long text will shrink to minimum font size</li>
          <li>Double border needs sufficient inset (3mm+)</li>
          <li>Shield shape needs height for 3 text lines</li>
          <li>Test cut on scrap material first</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Material Tips</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>Wood coasters</strong>: 3-6mm plywood or bamboo</li>
          <li><strong>Acrylic badges</strong>: 3mm clear or colored</li>
          <li><strong>Cork coasters</strong>: 3-4mm cork sheet (absorbs moisture)</li>
          <li><strong>MDF</strong>: 3mm for prototypes</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Laser Settings</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>Cutting</strong>: High power, slow speed (outline + borders)</li>
          <li><strong>Engraving</strong>: Medium power, fast speed (text)</li>
          <li>Set text as separate layer in LightBurn</li>
          <li>Test settings on scrap before batch cutting</li>
        </ul>
      </div>

      <div className="text-xs text-slate-500">
        <p>
          <strong>Pro tip:</strong> For coasters, seal wood with food-safe finish. For wedding favors, batch cut 50-100 pieces and personalize with names or dates!
        </p>
      </div>
    </div>
  );
}

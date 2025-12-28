/**
 * Bulk Name Tags Help Content
 * Usage instructions for generating multiple name tags
 */

export function BulkNameTagsHelp() {
  return (
    <div className="space-y-4 text-sm text-slate-300">
      <div>
        <h3 className="mb-2 font-semibold text-slate-100">What is Bulk Name Tags?</h3>
        <p className="text-slate-400">
          Generate hundreds of personalized name tags from a list or CSV file. Perfect for events, conferences, weddings, and team building.
        </p>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">How to Use</h4>
        <ol className="ml-4 list-decimal space-y-1 text-slate-400">
          <li>Upload a template SVG or use default shape</li>
          <li>Add names via CSV upload or paste list</li>
          <li>Adjust text position and font size</li>
          <li>Configure sheet layout (spacing, margins)</li>
          <li>Export as ZIP (individual tags) or Sheet (all on one page)</li>
        </ol>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Adding Names</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>CSV Upload</strong>: Upload Excel/CSV with name column</li>
          <li><strong>Paste List</strong>: One name per line, or comma-separated</li>
          <li><strong>Auto-cleanup</strong>: Trims spaces, removes duplicates</li>
          <li><strong>Limit</strong>: Up to 500 names (warning at 200+)</li>
        </ul>
      </div>

      <div className="rounded-lg border border-blue-900 bg-blue-950/20 p-3">
        <h4 className="mb-1 font-medium text-blue-300">💡 Recommended Settings</h4>
        <ul className="ml-4 list-disc space-y-1 text-blue-200/80">
          <li><strong>Tag size</strong>: 80×30mm for standard badges</li>
          <li><strong>Font size</strong>: 10-26pt with auto-fit enabled</li>
          <li><strong>Spacing</strong>: 4-5mm gap between tags</li>
          <li><strong>Margin</strong>: 5mm from sheet edge</li>
        </ul>
      </div>

      <div className="rounded-lg border border-amber-900 bg-amber-950/20 p-3">
        <h4 className="mb-1 font-medium text-amber-300">⚠️ Important Notes</h4>
        <ul className="ml-4 list-disc space-y-1 text-amber-200/80">
          <li>Long names may shrink to minimum font size</li>
          <li>Test cut 1-2 tags before batch production</li>
          <li>Export ZIP for individual tags (easier to organize)</li>
          <li>Export Sheet for efficient material usage</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Export Options</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>Export ZIP</strong>: One SVG file per name (tag-marius.svg)</li>
          <li><strong>Export Sheet</strong>: All tags arranged on one large SVG</li>
          <li><strong>Naming</strong>: Files use sanitized names (safe characters only)</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Production Tips</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li>Use 3mm acrylic or plywood for durability</li>
          <li>Add 5mm hole for lanyard attachment</li>
          <li>Test font size readability before cutting all</li>
          <li>Consider material color vs text engraving</li>
          <li>Cut tags in batches if &gt;100 names</li>
        </ul>
      </div>

      <div className="text-xs text-slate-500">
        <p>
          <strong>Pro tip:</strong> For events, organize tags alphabetically before cutting. Export ZIP and sort files by name!
        </p>
      </div>
    </div>
  );
}

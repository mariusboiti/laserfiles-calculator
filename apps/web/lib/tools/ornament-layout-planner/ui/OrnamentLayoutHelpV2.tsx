/**
 * Help component for Ornament Layout Planner V2
 */

export function OrnamentLayoutHelpV2() {
  return (
    <div className="prose prose-invert prose-sm max-w-none">
      <h2>Ornament / Nameplate Layout Planner V2</h2>
      
      <h3>Overview</h3>
      <p>
        Plan production layouts for laser-cut ornaments, nameplates, tags, and other repeating items.
        V2 adds multi-template support, automatic packing, multi-sheet export, and serial numbering.
      </p>

      <h3>Templates</h3>
      <ul>
        <li><strong>Upload multiple SVG files</strong> - Each template can have its own quantity</li>
        <li><strong>Rotate templates</strong> - 0°, 90°, 180°, or 270° rotation per template</li>
        <li><strong>Set quantities</strong> - Specify how many copies of each template to produce</li>
        <li><strong>Remove templates</strong> - Click × to remove unwanted templates</li>
      </ul>

      <h3>Layout Modes</h3>
      
      <h4>Grid Mode</h4>
      <ul>
        <li>Places items in a regular rows × columns grid</li>
        <li>Best for uniform layouts with single template</li>
        <li><strong>Auto-fit</strong> - Automatically calculates optimal rows/cols for sheet size</li>
        <li><strong>Center layout</strong> - Centers the grid on the sheet</li>
      </ul>

      <h4>Pack Mode (NEW)</h4>
      <ul>
        <li>Automatically packs items row-by-row without overlap</li>
        <li>Best for production orders with multiple templates</li>
        <li><strong>Group by template</strong> - Places all of template A, then B, then C</li>
        <li><strong>Allow auto-rotate</strong> - Tries 90° rotation if item doesn't fit on row</li>
        <li>Handles mixed sizes efficiently</li>
      </ul>

      <h3>Multi-Sheet Export</h3>
      <ul>
        <li>Automatically creates multiple sheets if items don't fit on one</li>
        <li>Sheet tabs show item count per sheet</li>
        <li><strong>Export current sheet</strong> - Download single SVG</li>
        <li><strong>Export ZIP</strong> - Download all sheets + manifest.json</li>
      </ul>

      <h3>Labels & Serial Numbering</h3>
      <ul>
        <li><strong>Show in preview</strong> - See labels without exporting them</li>
        <li><strong>Export labels</strong> - Include labels in SVG output</li>
        <li><strong>Label styles:</strong>
          <ul>
            <li>Index: #1, #2, #3...</li>
            <li>Template name: STAR, HEART...</li>
            <li>Name + Index: STAR-1, STAR-2...</li>
          </ul>
        </li>
        <li>⚠️ <em>Note: Text labels may require font availability in laser software. Consider converting to paths in your design app.</em></li>
      </ul>

      <h3>Production Tips</h3>
      <ul>
        <li><strong>Margin:</strong> Use 3-5mm to avoid edge issues</li>
        <li><strong>Gaps:</strong> Use 2-4mm between items for clean separation</li>
        <li><strong>Small gaps warning:</strong> Gaps &lt;0.5mm may cause parts to merge after kerf</li>
        <li><strong>Pack mode:</strong> Best for large orders (50+ items) with mixed templates</li>
        <li><strong>Grid mode:</strong> Best for uniform layouts with single template</li>
        <li><strong>Labels:</strong> Keep labels OFF for pure cutting (preview only)</li>
      </ul>

      <h3>Export Formats</h3>
      <ul>
        <li><strong>Single SVG:</strong> Current sheet only, ready for laser</li>
        <li><strong>ZIP Archive:</strong> All sheets + manifest.json with settings and item counts</li>
        <li>SVG files use mm units and include only cut paths (no debug bounds)</li>
        <li>Manifest includes: settings, templates, per-sheet item counts, warnings</li>
      </ul>

      <h3>Keyboard Shortcuts</h3>
      <ul>
        <li><strong>Ctrl+R:</strong> Reset to defaults</li>
        <li><strong>Tab:</strong> Navigate between sheet tabs</li>
      </ul>

      <h3>Troubleshooting</h3>
      <ul>
        <li><strong>"Items do not fit":</strong> Enable multi-sheet or reduce quantity</li>
        <li><strong>"Grid exceeds sheet":</strong> Enable auto-fit or reduce rows/cols</li>
        <li><strong>"Small gaps warning":</strong> Increase gap size to avoid kerf issues</li>
        <li><strong>"Overlap detected":</strong> Should not happen in pack mode - report if seen</li>
        <li><strong>SVG not loading:</strong> Check file has viewBox or width/height attributes</li>
      </ul>
    </div>
  );
}

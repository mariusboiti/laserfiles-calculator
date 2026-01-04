/**
 * Personalised Sign Generator V3 Help Content
 * Usage instructions for creating custom laser-cut signs
 */

export function PersonalisedSignHelp() {
  return (
    <div className="space-y-4 text-sm text-slate-300">
      <div>
        <h3 className="mb-2 font-semibold text-slate-100">What is Personalised Sign Generator V3?</h3>
        <p className="text-slate-400">
          Create custom laser-cut signs with 11 shapes, mounting holes, curved text, icons, monograms, and AI-assisted generation. Perfect for family names, workshop signs, welcome signs, and decorative pieces.
        </p>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">How to Use</h4>
        <ol className="ml-4 list-decimal space-y-1 text-slate-400">
          <li>Choose a shape (rectangle, arch, circle, hexagon, shield, tag, etc.)</li>
          <li>Set dimensions (width × height)</li>
          <li>Configure mounting holes or keyhole slots</li>
          <li>Enter text lines with font, size, and alignment controls</li>
          <li>Add optional icons or monograms</li>
          <li>Use AI to generate signs from descriptions</li>
          <li>Enable Sheet mode to produce multiple copies</li>
          <li>Export SVG for laser cutting</li>
        </ol>
      </div>

      <div className="rounded-lg border border-blue-900 bg-blue-950/20 p-3">
        <h4 className="mb-1 font-medium text-blue-300">💡 Recommended Sizes</h4>
        <ul className="ml-4 list-disc space-y-1 text-blue-200/80">
          <li><strong>Small sign</strong>: 300×150mm (family name, desk sign)</li>
          <li><strong>Medium sign</strong>: 500×250mm (workshop, welcome)</li>
          <li><strong>Large sign</strong>: 600×300mm (outdoor, decorative)</li>
          <li><strong>Text length</strong>: Keep main line under 20 characters for 300mm width</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Available Shapes</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>Basic</strong>: Rectangle, Rounded Rectangle, Circle, Oval</li>
          <li><strong>Arch</strong>: Arch, Rounded Arch (with rounded bottom corners)</li>
          <li><strong>Decorative</strong>: Hexagon, Stadium, Shield, Tag, Plaque</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Mounting Options</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>Top Center</strong>: Single hole for hanging</li>
          <li><strong>Two Top</strong>: Standard dual-hole mounting</li>
          <li><strong>Four Corners</strong>: Maximum stability</li>
          <li><strong>Two Sides</strong>: Left/right mounting</li>
          <li><strong>Keyhole Slots</strong>: Hidden wall mounting (adjustable length/width)</li>
          <li><strong>Diameter</strong>: 2-20mm (5mm fits M4 screws)</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Text Features</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>3 lines</strong>: Top (small), Main (large), Bottom (small)</li>
          <li><strong>Custom fonts</strong>: Type any font name installed on your system</li>
          <li><strong>Curved text</strong>: Arc Up or Arc Down with adjustable intensity</li>
          <li><strong>Alignment</strong>: Horizontal and vertical offset controls</li>
          <li><strong>Transform</strong>: UPPERCASE, lowercase, Title Case</li>
          <li><strong>Letter spacing</strong>: Fine-tune character spacing</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Icons & Monograms</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>Icons</strong>: 20 built-in icons (nature, symbols, animals, home, tools)</li>
          <li><strong>Placement</strong>: Left/right of text, above, or between lines</li>
          <li><strong>Monograms</strong>: 1-3 character decorative initials</li>
          <li><strong>Sizing</strong>: Adjustable icon and monogram sizes</li>
        </ul>
      </div>

      <div className="rounded-lg border border-purple-900 bg-purple-950/20 p-3">
        <h4 className="mb-1 font-medium text-purple-300">✨ AI Sign Generator</h4>
        <ul className="ml-4 list-disc space-y-1 text-purple-200/80">
          <li>Describe your sign in plain language</li>
          <li>Example: &quot;Family name sign for the Smiths, established 2020, with heart icon&quot;</li>
          <li>AI extracts text, suggests shape, icon, and layout</li>
          <li>Fine-tune the generated config as needed</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Sheet Layout Mode</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>Multiple copies</strong>: Produce several signs on one sheet</li>
          <li><strong>Presets</strong>: Common laser bed sizes (600×400, Glowforge, xTool P2)</li>
          <li><strong>Auto-fill</strong>: Automatically calculate optimal arrangement</li>
          <li><strong>Spacing</strong>: Configurable margins and gap between signs</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Output Options</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>Both</strong>: Export cut (outline + holes) and engrave (text + icons)</li>
          <li><strong>Cut only</strong>: Just the outline and mounting holes</li>
          <li><strong>Engrave only</strong>: Just the text and decorations</li>
          <li><strong>Design export</strong>: Include guides for reference</li>
          <li><strong>Stroke widths</strong>: Separate settings for cut vs engrave layers</li>
        </ul>
      </div>

      <div className="rounded-lg border border-amber-900 bg-amber-950/20 p-3">
        <h4 className="mb-1 font-medium text-amber-300">⚠️ Important Notes</h4>
        <ul className="ml-4 list-disc space-y-1 text-amber-200/80">
          <li>Long text may shrink to minimum font size</li>
          <li>Test cut on scrap material first</li>
          <li>Adjust laser power for engraving vs cutting</li>
          <li>CUT layer (black) = cut through, ENGRAVE layer (red) = surface engrave</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Material Tips</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>Wood</strong>: 3-6mm plywood or MDF (classic look)</li>
          <li><strong>Acrylic</strong>: 3-5mm clear or colored (modern look)</li>
          <li><strong>Cardboard</strong>: 2-3mm for prototypes</li>
          <li><strong>Kerf</strong>: Account for 0.1-0.2mm material loss</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Laser Settings</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>Cutting</strong>: High power, slow speed (outline + holes)</li>
          <li><strong>Engraving</strong>: Medium power, fast speed (text)</li>
          <li>Set text as separate layer in LightBurn</li>
          <li>Test settings on scrap before final cut</li>
        </ul>
      </div>

      <div className="text-xs text-slate-500">
        <p>
          <strong>Pro tip:</strong> For outdoor signs, use weather-resistant materials like marine plywood or UV-stable acrylic. Seal wood with varnish!
        </p>
      </div>
    </div>
  );
}

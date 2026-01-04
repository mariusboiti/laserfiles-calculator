/**
 * Product Label & SKU Generator Help Content
 */

export function ProductLabelHelp() {
  return (
    <div className="space-y-4 text-sm text-slate-300">
      <div>
        <h3 className="mb-2 font-semibold text-slate-100">What is Product Label & SKU Generator?</h3>
        <p className="text-slate-400">
          Create professional product labels with engraved text and optional QR codes. Perfect for inventory management, product packaging, and retail displays.
        </p>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Use Cases</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>Product Labels</strong>: Handmade goods, retail products</li>
          <li><strong>Inventory Tags</strong>: SKU tracking, warehouse management</li>
          <li><strong>Price Tags</strong>: Retail pricing, market displays</li>
          <li><strong>QR Labels</strong>: Link to product pages, instructions</li>
        </ul>
      </div>

      <div className="rounded-lg border border-blue-900 bg-blue-950/20 p-3">
        <h4 className="mb-1 font-medium text-blue-300">💡 Recommended Sizes</h4>
        <ul className="ml-4 list-disc space-y-1 text-blue-200/80">
          <li><strong>Small label</strong>: 50×25mm (compact products)</li>
          <li><strong>Standard label</strong>: 60×30mm (most products)</li>
          <li><strong>Large label</strong>: 80×40mm (packaging, displays)</li>
          <li><strong>QR code</strong>: 16-20mm for reliable scanning</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Label Components</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>Product Name</strong>: Main product identifier (top)</li>
          <li><strong>SKU</strong>: Stock keeping unit for inventory (middle)</li>
          <li><strong>Price</strong>: Optional pricing (bottom)</li>
          <li><strong>QR Code</strong>: Optional link to website/info (right side)</li>
          <li><strong>Border</strong>: Optional rounded rectangle outline</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">QR Code Tips</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>Use short URLs</strong>: Shorter = simpler QR = easier scan</li>
          <li><strong>Test scanning</strong>: Verify QR works after engraving</li>
          <li><strong>Minimum size</strong>: 16mm for reliable phone scanning</li>
          <li><strong>High contrast</strong>: Dark engraving on light material</li>
          <li>QR codes are vector (precise modules)</li>
        </ul>
      </div>

      <div className="rounded-lg border border-amber-900 bg-amber-950/20 p-3">
        <h4 className="mb-1 font-medium text-amber-300">⚠️ Important Notes</h4>
        <ul className="ml-4 list-disc space-y-1 text-amber-200/80">
          <li>QR too large may not fit - reduce size or increase label</li>
          <li>Long text will shrink to minimum font size</li>
          <li>Test QR scanning before batch production</li>
          <li>SKU recommended for inventory tracking</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Material Tips</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>Wood</strong>: 3mm plywood (natural, warm look)</li>
          <li><strong>Acrylic</strong>: 3mm white or clear (modern, clean)</li>
          <li><strong>Cardstock</strong>: Laser-safe cardstock (temporary labels)</li>
          <li><strong>Bamboo</strong>: 3mm bamboo (eco-friendly)</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Laser Settings</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li><strong>Cutting</strong>: High power, slow speed (outline)</li>
          <li><strong>Engraving</strong>: Medium power, fast speed (text + QR)</li>
          <li>Set text/QR as separate layer in LightBurn</li>
          <li>Test QR scanning after engraving</li>
          <li>Adjust power for material contrast</li>
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-medium text-slate-200">Production Tips</h4>
        <ul className="ml-4 list-disc space-y-1 text-slate-400">
          <li>Batch cut multiple labels for efficiency</li>
          <li>Use consistent SKU format (SKU-0001, SKU-0002, etc.)</li>
          <li>Test one label before cutting 100+</li>
          <li>Keep QR URLs short (use URL shortener)</li>
          <li>Apply adhesive backing for easy attachment</li>
        </ul>
      </div>

      <div className="text-xs text-slate-500">
        <p>
          <strong>Pro tip:</strong> For retail products, use white acrylic with deep engraving for maximum contrast. QR codes work best with high contrast! Test scanning from 30cm distance.
        </p>
      </div>
    </div>
  );
}

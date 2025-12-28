/**
 * Curved Photo Frame Generator V2 Help Component
 */

export function CurvedPhotoFrameV2Help() {
  return (
    <div className="prose prose-invert max-w-none">
      <h2>Curved Photo Frame Generator V2</h2>
      <p>
        Create laser-ready files for curved wooden photo frames with AI-assisted photo engraving preparation.
        This tool combines parametric frame design with intelligent image processing for professional results.
      </p>

      <h3>Features</h3>
      <ul>
        <li>
          <strong>AI Photo Engraving Prep:</strong> Automatic background removal, edge enhancement, and smart
          contrast adjustment for optimal laser engraving results.
        </li>
        <li>
          <strong>Smart Auto-Crop (PRO):</strong> Face and subject-aware cropping that automatically centers
          the most important part of your photo.
        </li>
        <li>
          <strong>Wood Style Presets:</strong> Pre-configured settings for Birch, Basswood, Walnut, and Acrylic
          materials with optimized contrast and dithering.
        </li>
        <li>
          <strong>Curved Frame Design:</strong> Parametric curved back panel with kerf-bend score lines for
          elegant 3D effect.
        </li>
        <li>
          <strong>Multiple Stand Types:</strong> Choose between slot stand (simple) or finger-joint stand
          (advanced) for different aesthetic preferences.
        </li>
      </ul>

      <h3>Workflow</h3>
      <ol>
        <li>
          <strong>Upload Photo:</strong> Start by uploading your photo (JPG, PNG, or WebP). The tool supports
          photos up to 10MB.
        </li>
        <li>
          <strong>AI Prep (Optional):</strong> Use Auto-Crop to intelligently frame your subject, enable
          background removal for clean results, and select a wood style preset.
        </li>
        <li>
          <strong>Process Photo:</strong> Click &quot;Process Photo for Engraving&quot; to apply all adjustments and
          generate the engraving-ready image with dithering.
        </li>
        <li>
          <strong>Configure Frame:</strong> Set photo size, material thickness, border width, curve strength,
          and stand type.
        </li>
        <li>
          <strong>Export:</strong> Download as SVG (free) or use PRO features for ZIP, DXF, and PDF exports.
        </li>
      </ol>

      <h3>Wood Style Presets</h3>
      <ul>
        <li>
          <strong>Birch:</strong> Soft contrast with preserved midtones. Best for photos with subtle details
          and natural skin tones.
        </li>
        <li>
          <strong>Basswood:</strong> Fine detail with lighter engraving. Ideal for portraits and high-detail
          images.
        </li>
        <li>
          <strong>Walnut:</strong> Strong contrast with heavier lines. Great for bold images and graphic
          designs.
        </li>
        <li>
          <strong>Acrylic:</strong> Clean edges with high contrast. Perfect for modern, high-contrast designs.
        </li>
      </ul>

      <h3>Layer Colors</h3>
      <ul>
        <li>
          <strong style={{ color: '#ef4444' }}>Red (CUT):</strong> Cutting paths for frame outline, window,
          and stand slots.
        </li>
        <li>
          <strong>Black (ENGRAVE):</strong> Raster engraving area for the processed photo.
        </li>
        <li>
          <strong style={{ color: '#3b82f6' }}>Blue (SCORE):</strong> Score lines on the back panel for
          kerf-bending.
        </li>
      </ul>

      <h3>Tips for Best Results</h3>
      <ul>
        <li>Use high-resolution photos (at least 1000px on the shortest side) for better engraving quality.</li>
        <li>Photos with clear subjects and good contrast work best for laser engraving.</li>
        <li>Test the kerf setting on scrap material before cutting your final frame.</li>
        <li>
          For curved frames, score the back panel deeply (but not through) and gently bend before assembly.
        </li>
        <li>The slot stand works best with 3mm material; use 4mm or 6mm for larger frames.</li>
      </ul>

      <h3>FREE vs PRO Features</h3>
      <p>
        <strong>FREE:</strong> Single photo size (10×15cm), slot stand only, manual crop, basic engraving
        adjustments, SVG export.
      </p>
      <p>
        <strong>PRO:</strong> All photo sizes + custom dimensions, all stand types, AI Auto-Crop, AI background
        removal, wood style presets, ZIP/DXF/PDF exports.
      </p>

      <h3>Technical Notes</h3>
      <ul>
        <li>Default kerf is 0.15mm. Adjust based on your laser and material.</li>
        <li>Engraving resolution is 254 DPI (10 dots per mm) for optimal speed and quality.</li>
        <li>
          The photo insertion slot on the back panel is sized for the material thickness plus clearance.
        </li>
        <li>Dithering algorithms: Stucki (best for wood), Floyd-Steinberg (classic), Atkinson (high contrast).</li>
      </ul>
    </div>
  );
}

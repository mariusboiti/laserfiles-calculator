# MultiLayer Maker Test Templates

## Test Template: multilayer-test.svg

This is a simple gradient circle designed to test the MultiLayer Maker tool.

### What it tests:
- Smooth grayscale gradients (white to black)
- Circular shapes that should segment cleanly into layers
- Good contrast for automatic threshold detection

### How to use:
1. Open MultiLayer Maker tool at `/studio/tools/multilayer-maker`
2. Upload this SVG (or convert to PNG/JPG first)
3. Try different presets:
   - **Portrait**: 6 layers with smooth transitions
   - **High Contrast**: 3 layers with bold separation
4. Adjust layer count (4-8 recommended for this image)
5. Generate layers and download ZIP

### Expected results:
- Should create concentric circular layers
- Each layer should be a ring (except center and outer)
- Alignment holes should be positioned at corners
- Combined preview should show gradient effect

### Tips for real images:
- Use high-contrast photos for best results
- Portraits work great with 6-8 layers
- Logos and graphics work with 3-5 layers
- Enable "Remove tiny islands" to clean up noise

## Creating your own test images:

For best results with MultiLayer Maker:
1. Use images with clear subjects and backgrounds
2. High contrast images work better than low contrast
3. Avoid very busy or noisy images
4. Square or portrait orientation works best
5. Minimum 500x500px recommended

## Recommended test subjects:
- Human portraits (face photos)
- Pet photos (especially with fur texture)
- Landscape photos with depth
- Logo designs with gradients
- Silhouettes with detail

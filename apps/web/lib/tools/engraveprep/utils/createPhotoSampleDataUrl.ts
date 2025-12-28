/**
 * createPhotoSampleDataUrl
 *
 * Creates a downscaled PNG data URL from a processed photo. The longest
 * side of the sample will be at most `maxSize` pixels so the SVG stays
 * reasonably small. This is used by the Test Card generator when the
 * pattern type is set to "photoSample".
 */

export function createPhotoSampleDataUrl(
  source: HTMLCanvasElement | ImageData,
  maxSize: number = 256
): string | null {
  try {
    let srcWidth: number;
    let srcHeight: number;
    let sourceCanvas: HTMLCanvasElement;

    if (source instanceof HTMLCanvasElement) {
      srcWidth = source.width;
      srcHeight = source.height;
      sourceCanvas = source;
    } else {
      srcWidth = source.width;
      srcHeight = source.height;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = srcWidth;
      tempCanvas.height = srcHeight;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return null;
      tempCtx.putImageData(source, 0, 0);
      sourceCanvas = tempCanvas;
    }

    if (srcWidth === 0 || srcHeight === 0) return null;

    const longestSide = Math.max(srcWidth, srcHeight);
    const scale = Math.min(1, maxSize / longestSide);

    const targetWidth = Math.max(1, Math.round(srcWidth * scale));
    const targetHeight = Math.max(1, Math.round(srcHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Draw scaled image into target canvas
    ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);

    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('Failed to create photo sample data URL', err);
    return null;
  }
}

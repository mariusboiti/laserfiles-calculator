/**
 * Preview/Canvas Screenshot Capture Utility
 * Captures only the preview area (SVG), not the entire screen
 */

const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 0.8;

/**
 * Captures a screenshot of the tool preview/canvas area
 * Looks for SVG elements in common preview selectors
 */
export async function capturePreviewScreenshot(): Promise<string | null> {
  try {
    // Common selectors for preview/canvas areas across tools
    const selectors = [
      '[data-preview] svg',
      '[data-canvas] svg',
      '.preview-container svg',
      '.canvas-container svg',
      '.tool-preview svg',
      '.svg-preview svg',
      'svg[data-tool-output]',
      '.lfs-tool svg',
    ];

    let svg: SVGElement | null = null;

    for (const selector of selectors) {
      svg = document.querySelector(selector);
      if (svg) break;
    }

    if (!svg) {
      console.warn('No SVG preview element found for screenshot capture');
      return null;
    }

    return await captureSvgAsDataUrl(svg);
  } catch (error) {
    console.error('Failed to capture preview screenshot:', error);
    return null;
  }
}

/**
 * Captures SVG element as JPEG data URL
 */
async function captureSvgAsDataUrl(svg: SVGElement): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      // Clone the SVG to avoid modifying the original
      const clone = svg.cloneNode(true) as SVGElement;
      
      // Ensure SVG has xmlns
      if (!clone.getAttribute('xmlns')) {
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      }

      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(clone);
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      const img = new Image();
      
      img.onload = () => {
        // Calculate dimensions
        let width = img.naturalWidth || 400;
        let height = img.naturalHeight || 300;
        
        // Scale down if too large
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          const scale = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Fill with dark background
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, width, height);
        }
        
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      
      img.src = url;
    } catch {
      resolve(null);
    }
  });
}

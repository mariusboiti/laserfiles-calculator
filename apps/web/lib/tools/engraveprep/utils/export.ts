/**
 * Export utilities for EngravePrep
 * 
 * Handles exporting processed images to PNG and BMP formats.
 * BMP export is manually constructed since browsers don't support it natively.
 * 
 * Export gating: checks usage limits before allowing download.
 */

import { ExportFormat } from '../types';
import { apiClient } from '../../../api-client';

interface UsageResponse {
  allowed: boolean;
  remaining: number;
  limit: number;
  plan: string;
}

/**
 * Export image data to the specified format and trigger download
 * Checks usage limits before exporting
 */
export async function exportImage(
  imageData: ImageData, 
  format: ExportFormat, 
  fileName: string,
  onUpgradeRequired?: () => void
): Promise<void> {
  try {
    // Check usage limit BEFORE exporting
    const usageRes = await apiClient.post<UsageResponse>('/usage/export', {
      toolKey: 'engraveprep',
    });

    if (!usageRes.data.allowed) {
      // Show upgrade modal if limit reached
      if (onUpgradeRequired) {
        onUpgradeRequired();
      } else {
        alert('Export limit reached. Please upgrade your plan to continue exporting.');
      }
      return;
    }

    // Proceed with export
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.putImageData(imageData, 0, 0);
    
    if (format === 'png') {
      exportAsPng(canvas, fileName);
    } else if (format === 'bmp') {
      exportAsBmp(imageData, fileName);
    }
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
}

/**
 * Export as PNG using native canvas.toBlob
 */
function exportAsPng(canvas: HTMLCanvasElement, fileName: string): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    downloadBlob(blob, `${fileName}.png`);
  }, 'image/png');
}

/**
 * Export as BMP (manually constructed)
 * Creates a 24-bit uncompressed BMP file
 */
function exportAsBmp(imageData: ImageData, fileName: string): void {
  const { width, height, data } = imageData;
  
  // BMP row size must be multiple of 4 bytes (each pixel = 3 bytes for 24-bit)
  const bytesPerRow = width * 3;
  const rowPadding = (4 - (bytesPerRow % 4)) % 4;
  const rowSize = bytesPerRow + rowPadding;
  const pixelDataSize = rowSize * height;
  const headerSize = 54;
  const fileSize = headerSize + pixelDataSize;
  
  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);
  
  // BMP File Header (14 bytes)
  view.setUint8(0, 0x42); // 'B'
  view.setUint8(1, 0x4D); // 'M'
  view.setUint32(2, fileSize, true); // File size
  view.setUint16(6, 0, true); // Reserved1
  view.setUint16(8, 0, true); // Reserved2
  view.setUint32(10, headerSize, true); // Pixel data offset
  
  // DIB Header (BITMAPINFOHEADER - 40 bytes)
  view.setUint32(14, 40, true); // Header size
  view.setInt32(18, width, true); // Width
  view.setInt32(22, -height, true); // Height (negative = top-down)
  view.setUint16(26, 1, true); // Color planes
  view.setUint16(28, 24, true); // Bits per pixel
  view.setUint32(30, 0, true); // Compression (none)
  view.setUint32(34, pixelDataSize, true); // Image size
  view.setInt32(38, 2835, true); // X pixels per meter (72 DPI)
  view.setInt32(42, 2835, true); // Y pixels per meter (72 DPI)
  view.setUint32(46, 0, true); // Colors in color table
  view.setUint32(50, 0, true); // Important colors
  
  // Pixel data (BGR format, top-down due to negative height)
  let offset = headerSize;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      view.setUint8(offset++, data[srcIdx + 2]); // B
      view.setUint8(offset++, data[srcIdx + 1]); // G
      view.setUint8(offset++, data[srcIdx]);     // R
    }
    // Padding to 4-byte boundary
    for (let p = 0; p < rowPadding; p++) {
      view.setUint8(offset++, 0);
    }
  }
  
  const blob = new Blob([buffer], { type: 'image/bmp' });
  downloadBlob(blob, `${fileName}.bmp`);
}

/**
 * Trigger file download
 */
function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

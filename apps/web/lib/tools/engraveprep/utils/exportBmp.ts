/**
 * BMP Export Utility
 * 
 * Converts ImageData to 24-bit BMP format with proper headers and row padding.
 * BMP files require rows to be padded to 4-byte boundaries.
 * 
 * Format: 24-bit uncompressed BMP (BGR color order)
 * Headers: BITMAPFILEHEADER (14 bytes) + BITMAPINFOHEADER (40 bytes)
 */

/**
 * Convert ImageData to 24-bit BMP Blob with robust padding
 */
export function exportToBmp(imageData: ImageData): Blob {
  const { width, height, data } = imageData;
  
  // BMP row size must be multiple of 4 bytes (each pixel = 3 bytes for 24-bit)
  const bytesPerRow = width * 3;
  const rowPadding = (4 - (bytesPerRow % 4)) % 4; // Padding to align to 4-byte boundary
  const rowSize = bytesPerRow + rowPadding;
  const pixelDataSize = rowSize * height;
  const headerSize = 54; // 14 (file header) + 40 (info header)
  const fileSize = headerSize + pixelDataSize;
  
  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);
  
  // Dev assertion: verify buffer size
  if (buffer.byteLength !== fileSize) {
    console.error('BMP buffer size mismatch:', buffer.byteLength, 'vs expected', fileSize);
  }
  
  // BITMAPFILEHEADER (14 bytes)
  view.setUint8(0, 0x42); // 'B'
  view.setUint8(1, 0x4D); // 'M'
  view.setUint32(2, fileSize, true); // Total file size (little-endian)
  view.setUint16(6, 0, true); // Reserved1
  view.setUint16(8, 0, true); // Reserved2
  view.setUint32(10, headerSize, true); // Offset to pixel data
  
  // BITMAPINFOHEADER (40 bytes)
  view.setUint32(14, 40, true); // Info header size
  view.setInt32(18, width, true); // Image width
  view.setInt32(22, -height, true); // Image height (negative = top-down, positive = bottom-up)
  view.setUint16(26, 1, true); // Number of color planes (must be 1)
  view.setUint16(28, 24, true); // Bits per pixel (24-bit RGB)
  view.setUint32(30, 0, true); // Compression method (0 = BI_RGB, uncompressed)
  view.setUint32(34, pixelDataSize, true); // Size of raw bitmap data
  view.setInt32(38, 2835, true); // Horizontal resolution (pixels/meter, ~72 DPI)
  view.setInt32(42, 2835, true); // Vertical resolution (pixels/meter, ~72 DPI)
  view.setUint32(46, 0, true); // Number of colors in palette (0 = default)
  view.setUint32(50, 0, true); // Number of important colors (0 = all)
  
  // Pixel data (BGR format, top-down scanline order due to negative height)
  let offset = headerSize;
  for (let y = 0; y < height; y++) {
    // Write pixel data for this row (BGR order)
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4; // RGBA source
      view.setUint8(offset++, data[srcIdx + 2]); // B
      view.setUint8(offset++, data[srcIdx + 1]); // G
      view.setUint8(offset++, data[srcIdx]);     // R
    }
    // Write row padding (0-3 bytes to align to 4-byte boundary)
    for (let p = 0; p < rowPadding; p++) {
      view.setUint8(offset++, 0);
    }
  }
  
  // Dev assertion: verify we wrote exactly fileSize bytes
  if (offset !== fileSize) {
    console.error('BMP offset mismatch:', offset, 'vs expected', fileSize);
  }
  
  return new Blob([buffer], { type: 'image/bmp' });
}

/**
 * Dev helper: Generate a test BMP with checkerboard pattern
 * Useful for manual testing of BMP export correctness
 */
export function generateTestBmp(): Blob {
  const width = 10;
  const height = 10;
  const imageData = new ImageData(width, height);
  
  // Create checkerboard pattern (alternating black/white)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const isBlack = (x + y) % 2 === 0;
      const color = isBlack ? 0 : 255;
      
      imageData.data[idx] = color;     // R
      imageData.data[idx + 1] = color; // G
      imageData.data[idx + 2] = color; // B
      imageData.data[idx + 3] = 255;   // A
    }
  }
  
  return exportToBmp(imageData);
}

/**
 * Dev helper: Download test BMP (call from console in dev mode)
 * Usage: import { downloadTestBmp } from './utils/exportBmp'; downloadTestBmp();
 */
export function downloadTestBmp(): void {
  const blob = generateTestBmp();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'test_checkerboard_10x10.bmp';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  console.log('Test BMP downloaded: 10x10 checkerboard pattern');
}

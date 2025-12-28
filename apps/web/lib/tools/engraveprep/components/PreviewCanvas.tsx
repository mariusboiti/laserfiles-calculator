/**
 * PreviewCanvas Component
 * 
 * Displays the processed image preview with:
 * - Before/After/Split view modes
 * - Zoom controls (fit, 100%, 200%)
 * - Pan support when zoomed
 * - Draggable split divider
 */

import React, { useEffect, useRef, useState, useCallback, MutableRefObject } from 'react';
import { Maximize2 } from 'lucide-react';
import { useImageStore } from '../store/useImageStore';

const MAX_PREVIEW_SIZE = 2048;

export function PreviewCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<'fit' | 100 | 200>('fit');
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  
  // Offscreen cached previews for fast redraw during split drag
  const beforePreviewRef = useRef<HTMLCanvasElement | null>(null);
  const afterPreviewRef = useRef<HTMLCanvasElement | null>(null);
  const previewSizeRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
  const lastImagesRef = useRef<{ before: ImageData | null; after: ImageData | null }>({
    before: null,
    after: null,
  });
  
  const { 
    processedImage, 
    croppedImage, 
    isProcessing,
    previewMode,
    splitPosition,
    setSplitPosition
  } = useImageStore();

  // Build cached previews when image data changes, and redraw for current mode/split
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const beforeImage = croppedImage;
    const afterImage = processedImage || croppedImage;
    if (!beforeImage) return;

    // Calculate preview dimensions (max 2048px on longest side)
    const scale = Math.min(1, MAX_PREVIEW_SIZE / Math.max(beforeImage.width, beforeImage.height));
    const previewWidth = Math.round(beforeImage.width * scale);
    const previewHeight = Math.round(beforeImage.height * scale);

    const sizeChanged =
      previewSizeRef.current.width !== previewWidth ||
      previewSizeRef.current.height !== previewHeight;
    const imagesChanged =
      lastImagesRef.current.before !== beforeImage || lastImagesRef.current.after !== afterImage;

    // Heavy work (scaling from ImageData) only when image or size changes
    if (sizeChanged || imagesChanged) {
      previewSizeRef.current = { width: previewWidth, height: previewHeight };
      lastImagesRef.current = { before: beforeImage, after: afterImage };

      const buildPreview = (
        source: ImageData,
        targetRef: MutableRefObject<HTMLCanvasElement | null>
      ) => {
        let offscreen = targetRef.current;
        if (!offscreen) {
          offscreen = document.createElement('canvas');
          targetRef.current = offscreen;
        }
        offscreen.width = previewWidth;
        offscreen.height = previewHeight;
        const offCtx = offscreen.getContext('2d');
        if (!offCtx) return;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = source.width;
        tempCanvas.height = source.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;
        tempCtx.putImageData(source, 0, 0);

        offCtx.clearRect(0, 0, previewWidth, previewHeight);
        offCtx.drawImage(tempCanvas, 0, 0, previewWidth, previewHeight);
      };

      buildPreview(beforeImage, beforePreviewRef);
      if (afterImage && afterImage !== beforeImage) {
        buildPreview(afterImage, afterPreviewRef);
      } else {
        // When there's no separate after image yet, reuse before canvas
        afterPreviewRef.current = null;
      }
    }

    const { width, height } = previewSizeRef.current;
    if (!width || !height) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const beforeCanvas = beforePreviewRef.current;
    if (!beforeCanvas) return;
    const afterCanvas = afterPreviewRef.current ?? beforeCanvas;

    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    if (previewMode === 'before') {
      ctx.drawImage(beforeCanvas, 0, 0, width, height);
    } else if (previewMode === 'after') {
      ctx.drawImage(afterCanvas, 0, 0, width, height);
    } else if (previewMode === 'split') {
      const splitX = Math.round((splitPosition / 100) * width);

      // Draw before on left side
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, splitX, height);
      ctx.clip();
      ctx.drawImage(beforeCanvas, 0, 0, width, height);
      ctx.restore();

      // Draw after on right side
      ctx.save();
      ctx.beginPath();
      ctx.rect(splitX, 0, width - splitX, height);
      ctx.clip();
      ctx.drawImage(afterCanvas, 0, 0, width, height);
      ctx.restore();

      // Draw split line
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(splitX, 0);
      ctx.lineTo(splitX, height);
      ctx.stroke();
    }
  }, [processedImage, croppedImage, previewMode, splitPosition]);

  // Handle split dragging - start drag only when clicking near the split line
  const handleSplitMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (previewMode !== 'split' || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const splitX = (splitPosition / 100) * rect.width;
      const threshold = 16; // px tolerance around the split line

      // Only start dragging when user clicks close to the split line
      if (Math.abs(x - splitX) <= threshold) {
        setIsDraggingSplit(true);
        e.preventDefault();
      }
    },
    [previewMode, splitPosition]
  );

  const handleSplitMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingSplit || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newPosition = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSplitPosition(newPosition);
  }, [isDraggingSplit, setSplitPosition]);

  const handleSplitMouseUp = useCallback(() => {
    setIsDraggingSplit(false);
  }, []);

  useEffect(() => {
    if (isDraggingSplit) {
      window.addEventListener('mousemove', handleSplitMouseMove);
      window.addEventListener('mouseup', handleSplitMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleSplitMouseMove);
        window.removeEventListener('mouseup', handleSplitMouseUp);
      };
    }
  }, [isDraggingSplit, handleSplitMouseMove, handleSplitMouseUp]);

  // Calculate canvas scale based on zoom
  const getCanvasScale = () => {
    if (zoom === 'fit') return 1;
    if (zoom === 100) return 1;
    if (zoom === 200) return 2;
    return 1;
  };

  return (
    <div 
      ref={containerRef}
      className="relative flex-1 flex items-center justify-center p-4 overflow-auto bg-gray-900"
    >
      {isProcessing && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
          <div className="flex items-center gap-3 text-white bg-gray-800 px-4 py-3 rounded-lg">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processing...
          </div>
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute top-20 right-4 z-10 flex flex-col gap-2 bg-gray-800/90 backdrop-blur-sm rounded-lg p-2 shadow-lg">
        <button
          onClick={() => setZoom('fit')}
          className={`p-2 rounded transition-colors ${
            zoom === 'fit' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
          }`}
          title="Fit to screen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom(100)}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            zoom === 100 ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
          }`}
          title="100%"
        >
          100%
        </button>
        <button
          onClick={() => setZoom(200)}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            zoom === 200 ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
          }`}
          title="200%"
        >
          200%
        </button>
      </div>

      <canvas
        ref={canvasRef}
        onMouseDown={handleSplitMouseDown}
        className={`shadow-lg ${
          zoom === 'fit' ? 'max-w-full max-h-full object-contain' : ''
        } ${
          previewMode === 'split' ? 'cursor-ew-resize' : ''
        }`}
        style={{
          transform: zoom === 'fit' ? 'none' : `scale(${getCanvasScale()})`,
          transformOrigin: 'center',
          backgroundImage: `
            linear-gradient(45deg, #333 25%, transparent 25%),
            linear-gradient(-45deg, #333 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #333 75%),
            linear-gradient(-45deg, transparent 75%, #333 75%)
          `,
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
          backgroundColor: '#222',
        }}
      />
    </div>
  );
}

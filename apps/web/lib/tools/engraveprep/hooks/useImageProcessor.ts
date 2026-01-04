/**
 * Custom hook for image processing with Web Worker
 * 
 * Features:
 * - Debounced processing (200ms) to avoid hammering worker during slider changes
 * - Job cancellation: only applies results from latest job
 * - Preview downscaling: large images (>2048px) downscaled for preview
 * - Full resolution maintained for export
 */

import { useEffect, useRef } from 'react';
import { useImageStore } from '../store/useImageStore';
import { WorkerInput, WorkerOutput } from '../types';
import { createPhotoSampleDataUrl } from '../utils/createPhotoSampleDataUrl';
import { processImagePipeline } from '../utils/imageProcessingCore';

const DEBOUNCE_DELAY = 200;
const MAX_PREVIEW_SIZE = 2048; // Max dimension for preview downscaling

export function useImageProcessor() {
  const workerRef = useRef<Worker | null>(null);
  const debounceRef = useRef<number | null>(null);
  const jobIdRef = useRef<number>(0); // Incrementing job ID for cancellation
  const workerSupportedRef = useRef(true);
  
  const { 
    croppedImage, 
    resizeState,
    adjustments,
    ditherMode,
    setProcessedImage, 
    setProcessedImageInfo,
    setIsProcessing,
    setBeforeAdjustmentsImage
  } = useImageStore();

  // Initialize worker
  useEffect(() => {
    try {
      workerRef.current = new Worker(
        new URL('../workers/imageProcessor.worker.ts', import.meta.url),
        { type: 'module' }
      );
      workerSupportedRef.current = true;
    } catch (error) {
      console.error(
        'Failed to initialize image processor worker, falling back to main-thread processing:',
        error
      );
      workerRef.current = null;
      workerSupportedRef.current = false;
      return;
    }

    workerRef.current.onmessage = (e: MessageEvent<WorkerOutput>) => {
      const { type, jobId, imageData, error } = e.data;
      
      // Job cancellation: check against latest jobId ref (not state)
      const currentJob = `job_${jobIdRef.current}`;
      if (jobId && jobId !== currentJob) {
        console.log('Ignoring stale job result:', jobId, 'current:', currentJob);
        return;
      }
      
      if (type === 'result' && imageData) {
        // Store processed image for preview / export
        setProcessedImage(imageData);

        // Generate a downscaled PNG data URL sample for Test Card "photoSample" pattern
        const sampleDataUrl = createPhotoSampleDataUrl(imageData, 256);
        setProcessedImageInfo({
          width: imageData.width,
          height: imageData.height,
          sampleDataUrl: sampleDataUrl ?? null,
        });

        setIsProcessing(false);
      } else if (type === 'error') {
        console.error('Worker error:', error);
        setProcessedImageInfo(null);
        setIsProcessing(false);
      }
    };

    workerRef.current.onerror = (error) => {
      console.error('Worker error:', error);
      setIsProcessing(false);
      workerSupportedRef.current = false;
    };

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [setProcessedImage, setProcessedImageInfo, setIsProcessing]);

  // Trigger processing when parameters change
  useEffect(() => {
    if (!croppedImage) return;

    // Clear pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    setIsProcessing(true);

    // Debounce processing (200ms delay for slider changes)
    debounceRef.current = window.setTimeout(() => {
      // Generate new job ID for cancellation
      jobIdRef.current += 1;
      const jobId = `job_${jobIdRef.current}`;

      // Calculate target pixel dimensions from mm and DPI
      const mmToInch = 1 / 25.4;
      const targetWidthPx = Math.round(resizeState.widthMm * mmToInch * resizeState.dpi);
      const targetHeightPx = Math.round(resizeState.heightMm * mmToInch * resizeState.dpi);

      // Preview downscaling: if image is large, downscale for preview
      // Full resolution is maintained in worker for export
      let imageToProcess = croppedImage;
      const maxDim = Math.max(croppedImage.width, croppedImage.height);
      
      if (maxDim > MAX_PREVIEW_SIZE) {
        // Downscale for preview
        const scale = MAX_PREVIEW_SIZE / maxDim;
        const previewWidth = Math.round(croppedImage.width * scale);
        const previewHeight = Math.round(croppedImage.height * scale);
        
        const canvas = document.createElement('canvas');
        canvas.width = previewWidth;
        canvas.height = previewHeight;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = croppedImage.width;
          tempCanvas.height = croppedImage.height;
          const tempCtx = tempCanvas.getContext('2d');
          
          if (tempCtx) {
            tempCtx.putImageData(croppedImage, 0, 0);
            ctx.drawImage(tempCanvas, 0, 0, previewWidth, previewHeight);
            imageToProcess = ctx.getImageData(0, 0, previewWidth, previewHeight);
            console.log('Preview downscaled:', maxDim, '->', MAX_PREVIEW_SIZE);
          }
        }
      }

      if (workerSupportedRef.current && workerRef.current) {
        // Clone ImageData for transfer to worker
        const clonedData = new ImageData(
          new Uint8ClampedArray(imageToProcess.data),
          imageToProcess.width,
          imageToProcess.height
        );

        const message: WorkerInput = {
          type: 'process',
          jobId,
          imageData: clonedData,
          width: imageToProcess.width,
          height: imageToProcess.height,
          adjustments,
          ditherMethod: ditherMode,
          targetWidthPx,
          targetHeightPx,
        };

        workerRef.current.postMessage(message, { transfer: [clonedData.data.buffer] });
      } else {
        // Fallback: process image on main thread when worker is unavailable
        try {
          const result = processImagePipeline(
            imageToProcess,
            adjustments,
            ditherMode,
            targetWidthPx,
            targetHeightPx
          );

          setProcessedImage(result);

          const sampleDataUrl = createPhotoSampleDataUrl(result, 256);
          setProcessedImageInfo({
            width: result.width,
            height: result.height,
            sampleDataUrl: sampleDataUrl ?? null,
          });

          setIsProcessing(false);
        } catch (error) {
          console.error('Image processing error (fallback):', error);
          setProcessedImage(null);
          setProcessedImageInfo(null);
          setIsProcessing(false);
        }
      }
    }, DEBOUNCE_DELAY);
  }, [
    croppedImage,
    resizeState,
    adjustments,
    ditherMode,
    setIsProcessing,
    setBeforeAdjustmentsImage,
    setProcessedImage,
    setProcessedImageInfo,
  ]);
}

'use client';

import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import EngravePrepApp from '../App';
import { useImageStore } from '../store/useImageStore';
import type { ImageInfo, Project } from '../types';
import { useToolUx } from '@/components/ux/ToolUxProvider';

export interface EngravePrepToolRef {
  reset: () => void;
}

const SESSION_VERSION = 1;

type EngravePrepSessionState = {
  version: typeof SESSION_VERSION;
  imageDataUrl: string | null;
  imageInfo: ImageInfo | null;
  project: Project | null;
};

function imageDataToPngDataUrl(imageData: ImageData, maxDim: number): string {
  const w = imageData.width;
  const h = imageData.height;
  const scale = Math.min(1, maxDim / Math.max(w, h));
  const outW = Math.max(1, Math.round(w * scale));
  const outH = Math.max(1, Math.round(h * scale));

  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = w;
  srcCanvas.height = h;
  const srcCtx = srcCanvas.getContext('2d');
  if (!srcCtx) return '';
  srcCtx.putImageData(imageData, 0, 0);

  const outCanvas = document.createElement('canvas');
  outCanvas.width = outW;
  outCanvas.height = outH;
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) return '';
  outCtx.drawImage(srcCanvas, 0, 0, w, h, 0, 0, outW, outH);

  return outCanvas.toDataURL('image/png');
}

async function pngDataUrlToImageData(url: string): Promise<ImageData | null> {
  return await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        resolve(ctx.getImageData(0, 0, img.width, img.height));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function buildProjectFromState(args: {
  imageInfo: ImageInfo | null;
  cropState: any;
  resizeState: any;
  adjustments: any;
  ditherMode: any;
  easyMode: boolean;
  easyModeLevel: any;
  previewMode: any;
  splitPosition: number;
  activeTab: any;
  testCardForm: any;
}): Project {
  const mmToInch = 1 / 25.4;
  const targetWidthPx = Math.round(args.resizeState.widthMm * mmToInch * args.resizeState.dpi);
  const targetHeightPx = Math.round(args.resizeState.heightMm * mmToInch * args.resizeState.dpi);

  return {
    version: 1,
    image: {
      originalFileName: args.imageInfo?.fileName ?? null,
      originalFileSize: args.imageInfo?.fileSize ?? null,
      originalWidth: args.imageInfo?.originalWidth ?? null,
      originalHeight: args.imageInfo?.originalHeight ?? null,
      hash: args.imageInfo
        ? `${args.imageInfo.fileName}-${args.imageInfo.fileSize}-${args.imageInfo.originalWidth}x${args.imageInfo.originalHeight}`
        : null,
    },
    processing: {
      cropState: args.cropState,
      resizeState: args.resizeState,
      targetWidthPx,
      targetHeightPx,
      adjustments: args.adjustments,
      ditherMode: args.ditherMode,
      materialPresetId: null,
      easyMode: {
        enabled: args.easyMode,
        level: args.easyModeLevel,
      },
      previewMode: args.previewMode,
      splitPosition: args.splitPosition,
    },
    ui: {
      activeTab: args.activeTab,
    },
    testCard: args.testCardForm ?? undefined,
  };
}

export const EngravePrepTool = forwardRef<EngravePrepToolRef>((props, ref) => {
  const reset = useImageStore((state) => state.reset);
  const originalImage = useImageStore((state) => state.originalImage);
  const imageInfo = useImageStore((state) => state.imageInfo);
  const cropState = useImageStore((state) => state.cropState);
  const resizeState = useImageStore((state) => state.resizeState);
  const adjustments = useImageStore((state) => state.adjustments);
  const ditherMode = useImageStore((state) => state.ditherMode);
  const easyMode = useImageStore((state) => state.easyMode);
  const easyModeLevel = useImageStore((state) => state.easyModeLevel);
  const previewMode = useImageStore((state) => state.previewMode);
  const splitPosition = useImageStore((state) => state.splitPosition);
  const activeTab = useImageStore((state) => state.activeTab);
  const testCardForm = useImageStore((state) => state.testCardForm);
  const setOriginalImage = useImageStore((state) => state.setOriginalImage);
  const loadProject = useImageStore((state) => state.loadProject);

  const { api } = useToolUx();

  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);

  const project = useMemo<Project | null>(() => {
    if (!imageInfo) return null;
    return buildProjectFromState({
      imageInfo,
      cropState,
      resizeState,
      adjustments,
      ditherMode,
      easyMode,
      easyModeLevel,
      previewMode,
      splitPosition,
      activeTab,
      testCardForm,
    });
  }, [
    activeTab,
    adjustments,
    cropState,
    ditherMode,
    easyMode,
    easyModeLevel,
    imageInfo,
    previewMode,
    resizeState,
    splitPosition,
    testCardForm,
  ]);

  useEffect(() => {
    api.setIsEmpty(!originalImage);
  }, [api, originalImage]);

  useEffect(() => {
    api.setPrimaryAction({
      label: 'Upload image',
      onClick: () => {
        window.dispatchEvent(new Event('engraveprep:open-file-picker'));
      },
    });
  }, [api]);

  useEffect(() => {
    api.setSessionAdapter({
      version: SESSION_VERSION,
      restore: async (raw) => {
        const s = raw as Partial<EngravePrepSessionState> | null;
        if (!s || s.version !== SESSION_VERSION) return;

        if (s.imageDataUrl && s.imageInfo) {
          const restored = await pngDataUrlToImageData(s.imageDataUrl);
          if (restored) {
            setOriginalImage(restored, s.imageInfo);
          }
        }

        if (s.project && s.project.version === 1) {
          loadProject(s.project);
        }
      },
    });
  }, [api, loadProject, setOriginalImage]);

  useEffect(() => {
    if (!originalImage) {
      setImageDataUrl(null);
      return;
    }

    try {
      const url = imageDataToPngDataUrl(originalImage, 1024);
      setImageDataUrl(url || null);
    } catch {
      setImageDataUrl(null);
    }
  }, [originalImage]);

  useEffect(() => {
    if (!imageInfo && !project && !imageDataUrl) {
      api.setSessionState(undefined);
      return;
    }

    api.setSessionState({
      version: SESSION_VERSION,
      imageDataUrl: imageDataUrl ?? null,
      imageInfo: imageInfo ?? null,
      project: project ?? null,
    } satisfies EngravePrepSessionState);
  }, [api, imageDataUrl, imageInfo, project]);

  useImperativeHandle(ref, () => ({
    reset,
  }));

  return <EngravePrepApp />;
});

EngravePrepTool.displayName = 'EngravePrepTool';

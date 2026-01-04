'use client';

/**
 * Export Artifact Hook
 * Reusable hook for tools to save exports to artifact library
 */

import { useState, useCallback } from 'react';
import { createArtifact, addToPriceCalculator, type Artifact } from '@/lib/artifacts/client';

export interface ExportPayload {
  svg?: string;
  dxfBase64?: string;
  pdfBase64?: string;
  previewPngBase64?: string;
  meta?: Record<string, unknown>;
}

export interface UseExportArtifactOptions {
  toolSlug: string;
  defaultName: string;
  getExportPayload: () => Promise<ExportPayload> | ExportPayload;
}

export interface UseExportArtifactReturn {
  // State
  isSaveDialogOpen: boolean;
  isSaving: boolean;
  error: string | null;
  lastSavedArtifact: Artifact | null;

  // Actions
  openSaveDialog: () => void;
  closeSaveDialog: () => void;
  saveAsArtifact: (name: string, description?: string) => Promise<Artifact | null>;
  saveAndAddToPriceCalculator: (name: string, description?: string) => Promise<void>;

  // Helper for dialog
  getExportPayload: () => Promise<ExportPayload>;
}

export function useExportArtifact(options: UseExportArtifactOptions): UseExportArtifactReturn {
  const { toolSlug, defaultName, getExportPayload } = options;

  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSavedArtifact, setLastSavedArtifact] = useState<Artifact | null>(null);

  const openSaveDialog = useCallback(() => {
    setIsSaveDialogOpen(true);
    setError(null);
  }, []);

  const closeSaveDialog = useCallback(() => {
    setIsSaveDialogOpen(false);
    setError(null);
  }, []);

  const saveAsArtifact = useCallback(
    async (name: string, description?: string): Promise<Artifact | null> => {
      setIsSaving(true);
      setError(null);

      try {
        const payload = await getExportPayload();

        if (!payload.svg && !payload.dxfBase64 && !payload.pdfBase64) {
          throw new Error('No export data available');
        }

        const artifact = await createArtifact({
          toolSlug,
          name,
          description,
          svg: payload.svg,
          dxfBase64: payload.dxfBase64,
          pdfBase64: payload.pdfBase64,
          previewPngBase64: payload.previewPngBase64,
          meta: payload.meta,
        });

        setLastSavedArtifact(artifact);
        setIsSaveDialogOpen(false);

        return artifact;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save artifact';
        setError(message);
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [toolSlug, getExportPayload]
  );

  const saveAndAddToPriceCalculator = useCallback(
    async (name: string, description?: string): Promise<void> => {
      const artifact = await saveAsArtifact(name, description);
      if (artifact) {
        addToPriceCalculator(artifact);
      }
    },
    [saveAsArtifact]
  );

  const wrappedGetExportPayload = useCallback(async (): Promise<ExportPayload> => {
    return getExportPayload();
  }, [getExportPayload]);

  return {
    isSaveDialogOpen,
    isSaving,
    error,
    lastSavedArtifact,
    openSaveDialog,
    closeSaveDialog,
    saveAsArtifact,
    saveAndAddToPriceCalculator,
    getExportPayload: wrappedGetExportPayload,
  };
}

/**
 * Toast notification helper for artifact saves
 */
export function showArtifactSavedToast(artifactName: string): void {
  // Simple toast implementation - can be replaced with your toast library
  if (typeof window !== 'undefined') {
    const toast = document.createElement('div');
    toast.className =
      'fixed bottom-4 right-4 z-50 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-lg';
    toast.innerHTML = `
      <div class="flex items-center gap-2">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <span>Saved "${artifactName}" to Library</span>
      </div>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

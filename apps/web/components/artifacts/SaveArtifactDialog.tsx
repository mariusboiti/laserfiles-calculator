'use client';

/**
 * Save Artifact Dialog
 * Dialog for saving current export to the artifact library
 */

import { useState } from 'react';
import { X, Save, Package } from 'lucide-react';
import { createArtifact, type CreateArtifactParams } from '@/lib/artifacts/client';

interface SaveArtifactDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved?: (artifact: { id: string; name: string }) => void;
  toolSlug: string;
  defaultName: string;
  getExportData: () => Promise<{
    svg?: string;
    dxfBase64?: string;
    pdfBase64?: string;
    previewPngBase64?: string;
    meta?: Record<string, unknown>;
  }>;
}

export function SaveArtifactDialog({
  open,
  onClose,
  onSaved,
  toolSlug,
  defaultName,
  getExportData,
}: SaveArtifactDialogProps) {
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const exportData = await getExportData();

      if (!exportData.svg && !exportData.dxfBase64 && !exportData.pdfBase64) {
        throw new Error('No export data available');
      }

      const params: CreateArtifactParams = {
        toolSlug,
        name: name.trim(),
        description: description.trim() || undefined,
        svg: exportData.svg,
        dxfBase64: exportData.dxfBase64,
        pdfBase64: exportData.pdfBase64,
        previewPngBase64: exportData.previewPngBase64,
        meta: exportData.meta,
      };

      const artifact = await createArtifact(params);

      onSaved?.({ id: artifact.id, name: artifact.name });
      onClose();

      // Reset form
      setName(defaultName);
      setDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save artifact');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-sky-400" />
            <h2 className="text-lg font-semibold text-slate-100">Save to Library</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4 p-4">
          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Design"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">
              Description <span className="text-slate-500">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes about this design..."
              rows={3}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-900/30 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-slate-700 px-4 py-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save to Library'}
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

/**
 * Artifact Picker Modal
 * Allows users to browse and select artifacts from their library
 */

import { useState, useEffect, useCallback } from 'react';
import { Search, X, Package, Calendar, Maximize2 } from 'lucide-react';
import {
  fetchArtifacts,
  getToolDisplayName,
  formatDimensions,
  type Artifact,
} from '@/lib/artifacts/client';

interface ArtifactPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (artifact: Artifact) => void;
  toolFilter?: string;
  title?: string;
}

const TOOLS = [
  { slug: '', label: 'All Tools' },
  { slug: 'boxmaker', label: 'BoxMaker' },
  { slug: 'engrave-prep', label: 'EngravePrep' },
  { slug: 'panel-splitter', label: 'Panel Splitter' },
  { slug: 'personalised-sign-generator', label: 'Sign Generator' },
  { slug: 'qr-generator', label: 'QR Generator' },
  { slug: 'living-hinge', label: 'Living Hinge' },
  { slug: 'multilayer', label: 'Multilayer' },
  { slug: 'text-to-path', label: 'Text to Path' },
  { slug: 'puzzle-maker', label: 'Puzzle Maker' },
];

export function ArtifactPickerModal({
  open,
  onClose,
  onSelect,
  toolFilter,
  title = 'Select from Library',
}: ArtifactPickerModalProps) {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedTool, setSelectedTool] = useState(toolFilter || '');
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const loadArtifacts = useCallback(async (append = false) => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchArtifacts({
        q: search || undefined,
        toolSlug: selectedTool || undefined,
        limit: 20,
        cursor: append ? nextCursor || undefined : undefined,
      });

      if (append) {
        setArtifacts((prev) => [...prev, ...result.artifacts]);
      } else {
        setArtifacts(result.artifacts);
      }
      setNextCursor(result.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load artifacts');
    } finally {
      setLoading(false);
    }
  }, [search, selectedTool, nextCursor]);

  useEffect(() => {
    if (open) {
      loadArtifacts();
    }
  }, [open, search, selectedTool]);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setArtifacts([]);
      setNextCursor(null);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex h-[80vh] w-full max-w-3xl flex-col rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
          <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 border-b border-slate-800 px-4 py-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search artifacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* Tool filter */}
          {!toolFilter && (
            <select
              value={selectedTool}
              onChange={(e) => setSelectedTool(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              {TOOLS.map((tool) => (
                <option key={tool.slug} value={tool.slug}>
                  {tool.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Artifact List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && artifacts.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-900/30 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {!loading && !error && artifacts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="mb-3 h-12 w-12 text-slate-600" />
              <p className="text-sm text-slate-400">No artifacts found</p>
              <p className="mt-1 text-xs text-slate-500">
                Save designs from any tool to see them here
              </p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {artifacts.map((artifact) => (
              <button
                key={artifact.id}
                onClick={() => onSelect(artifact)}
                className="group flex gap-3 rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-left transition-colors hover:border-sky-500 hover:bg-slate-800"
              >
                {/* Preview */}
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-md bg-slate-900">
                  {artifact.previewPngUrl ? (
                    <img
                      src={artifact.previewPngUrl}
                      alt={artifact.name}
                      className="h-full w-full rounded-md object-contain"
                    />
                  ) : artifact.fileSvgUrl ? (
                    <img
                      src={artifact.fileSvgUrl}
                      alt={artifact.name}
                      className="h-full w-full rounded-md object-contain"
                    />
                  ) : (
                    <Package className="h-8 w-8 text-slate-600" />
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-slate-200 group-hover:text-sky-400">
                    {artifact.name}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {getToolDisplayName(artifact.toolSlug)}
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Maximize2 className="h-3 w-3" />
                      {formatDimensions(artifact.metaJson)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(artifact.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Load More */}
          {nextCursor && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => loadArtifacts(true)}
                disabled={loading}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 px-4 py-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

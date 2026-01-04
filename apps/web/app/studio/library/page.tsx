'use client';

/**
 * Artifact Library Page
 * Browse, search, and manage saved artifacts from all tools
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Package,
  Calendar,
  Maximize2,
  Download,
  Trash2,
  Calculator,
  ExternalLink,
  Filter,
} from 'lucide-react';
import {
  fetchArtifacts,
  deleteArtifact,
  getToolDisplayName,
  formatDimensions,
  addToPriceCalculator,
  type Artifact,
} from '@/lib/artifacts/client';
import { ExportMiniDisclaimer } from '@/components/legal';

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

export default function LibraryPage() {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedTool, setSelectedTool] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadArtifacts = useCallback(
    async (append = false) => {
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
    },
    [search, selectedTool, nextCursor]
  );

  useEffect(() => {
    loadArtifacts();
  }, [search, selectedTool]);

  const handleDelete = async (artifact: Artifact) => {
    if (!confirm(`Delete "${artifact.name}"? This action cannot be undone.`)) {
      return;
    }

    setDeleting(artifact.id);
    try {
      await deleteArtifact(artifact.id);
      setArtifacts((prev) => prev.filter((a) => a.id !== artifact.id));
    } catch (err) {
      alert('Failed to delete artifact');
    } finally {
      setDeleting(null);
    }
  };

  const handleAddToPriceCalculator = (artifact: Artifact) => {
    addToPriceCalculator(artifact);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Artifact Library</h1>
        <p className="mt-1 text-sm text-slate-400">
          Browse and manage your saved designs from all Studio tools
        </p>
      </div>

      <ExportMiniDisclaimer />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
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
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
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
        </div>
      </div>

      {/* Content */}
      {loading && artifacts.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-900/30 p-4 text-sm text-red-300">{error}</div>
      )}

      {!loading && !error && artifacts.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/50 py-16 text-center">
          <Package className="mb-4 h-16 w-16 text-slate-600" />
          <h3 className="text-lg font-medium text-slate-300">No artifacts yet</h3>
          <p className="mt-2 max-w-md text-sm text-slate-500">
            Save designs from any Studio tool to build your library. Use the "Save to
            Library" button when exporting from BoxMaker, EngravePrep, and other tools.
          </p>
        </div>
      )}

      {/* Artifact Grid */}
      {artifacts.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {artifacts.map((artifact) => (
            <div
              key={artifact.id}
              className="group rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition-colors hover:border-slate-700"
            >
              {/* Preview */}
              <div className="relative mb-3 flex h-32 items-center justify-center rounded-lg bg-slate-800">
                {artifact.previewPngUrl ? (
                  <img
                    src={artifact.previewPngUrl}
                    alt={artifact.name}
                    className="h-full w-full rounded-lg object-contain"
                  />
                ) : artifact.fileSvgUrl ? (
                  <img
                    src={artifact.fileSvgUrl}
                    alt={artifact.name}
                    className="h-full w-full rounded-lg object-contain"
                  />
                ) : (
                  <Package className="h-12 w-12 text-slate-600" />
                )}

                {/* Hover actions */}
                <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-lg bg-slate-900/80 opacity-0 transition-opacity group-hover:opacity-100">
                  {artifact.fileSvgUrl && (
                    <a
                      href={artifact.fileSvgUrl}
                      download={`${artifact.name}.svg`}
                      className="rounded-lg bg-slate-700 p-2 text-slate-200 hover:bg-slate-600"
                      title="Download SVG"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  )}
                  {artifact.fileDxfUrl && (
                    <a
                      href={artifact.fileDxfUrl}
                      download={`${artifact.name}.dxf`}
                      className="rounded-lg bg-slate-700 p-2 text-slate-200 hover:bg-slate-600"
                      title="Download DXF"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  )}
                  <button
                    onClick={() => handleAddToPriceCalculator(artifact)}
                    className="rounded-lg bg-sky-600 p-2 text-white hover:bg-sky-500"
                    title="Add to Price Calculator"
                  >
                    <Calculator className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(artifact)}
                    disabled={deleting === artifact.id}
                    className="rounded-lg bg-red-600/80 p-2 text-white hover:bg-red-600 disabled:opacity-50"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Info */}
              <div>
                <h3 className="truncate font-medium text-slate-200">{artifact.name}</h3>
                <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                  <span className="rounded bg-slate-800 px-1.5 py-0.5">
                    {getToolDisplayName(artifact.toolSlug)}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Maximize2 className="h-3 w-3" />
                    {formatDimensions(artifact.metaJson)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(artifact.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {artifact.description && (
                  <p className="mt-2 line-clamp-2 text-xs text-slate-500">
                    {artifact.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load More */}
      {nextCursor && (
        <div className="flex justify-center pt-4">
          <button
            onClick={() => loadArtifacts(true)}
            disabled={loading}
            className="rounded-lg border border-slate-700 px-6 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}

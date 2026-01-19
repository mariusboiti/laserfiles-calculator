'use client';

/**
 * AI Image Library Panel
 * Gallery view for all saved AI images with filtering and actions
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { X, Search, Image as ImageIcon, Filter, Trash2, Download, Grid, List } from 'lucide-react';
import {
  listImages,
  deleteImage,
  downloadImage,
  getStorageInfo,
  getToolSlugs,
  type AIImageAsset,
} from '@/lib/ai/aiImageLibrary';
import { AIImageCard } from './AIImageCard';

interface AIImageLibraryPanelProps {
  open: boolean;
  onClose: () => void;
  currentToolSlug?: string;
  onSelectImage?: (asset: AIImageAsset) => void;
  canUseImages?: boolean;
}

export function AIImageLibraryPanel({
  open,
  onClose,
  currentToolSlug,
  onSelectImage,
  canUseImages = true,
}: AIImageLibraryPanelProps) {
  const [search, setSearch] = useState('');
  const [filterTool, setFilterTool] = useState<string | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [images, setImages] = useState<AIImageAsset[]>([]);
  const [toolSlugs, setToolSlugs] = useState<string[]>([]);
  const [storageInfo, setStorageInfo] = useState({ count: 0, maxCount: 100, estimatedSizeKB: 0, maxSizeKB: 51200 });

  // Load images on open
  useEffect(() => {
    if (open) {
      refreshImages();
    }
  }, [open]);

  const refreshImages = useCallback(() => {
    const filter = filterTool === 'all' ? {} : { toolSlug: filterTool };
    setImages(listImages(filter));
    setToolSlugs(getToolSlugs());
    setStorageInfo(getStorageInfo());
  }, [filterTool]);

  // Filter by search
  const filteredImages = useMemo(() => {
    if (!search.trim()) return images;

    const searchLower = search.toLowerCase();
    return images.filter((img) => {
      const searchable = [img.title, img.prompt, ...(img.tags || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return searchable.includes(searchLower);
    });
  }, [images, search]);

  const handleUse = useCallback((asset: AIImageAsset) => {
    onSelectImage?.(asset);
    onClose();
  }, [onSelectImage, onClose]);

  const handleDownload = useCallback((asset: AIImageAsset) => {
    downloadImage(asset);
  }, []);

  const handleDelete = useCallback((asset: AIImageAsset) => {
    if (deleteImage(asset.id)) {
      refreshImages();
    }
  }, [refreshImages]);

  const handleFilterChange = useCallback((value: string) => {
    setFilterTool(value);
    const filter = value === 'all' ? {} : { toolSlug: value };
    setImages(listImages(filter));
  }, []);

  if (!open) return null;

  const storagePercent = Math.round((storageInfo.estimatedSizeKB / storageInfo.maxSizeKB) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-4xl max-h-[85vh] mx-4 rounded-xl border border-slate-800 bg-slate-900 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <ImageIcon className="w-5 h-5 text-violet-400" />
            <div>
              <h2 className="text-lg font-semibold text-slate-100">AI Library</h2>
              <p className="text-xs text-slate-500">
                {storageInfo.count} images · {Math.round(storageInfo.estimatedSizeKB / 1024 * 10) / 10}MB used
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 px-6 py-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or prompt..."
              className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:border-sky-500/50 focus:outline-none"
            />
          </div>

          {/* Tool filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={filterTool}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-sky-500/50 focus:outline-none"
            >
              <option value="all">All tools</option>
              {currentToolSlug && (
                <option value={currentToolSlug}>This tool only</option>
              )}
              {toolSlugs
                .filter((slug) => slug !== currentToolSlug)
                .map((slug) => (
                  <option key={slug} value={slug}>
                    {slug}
                  </option>
                ))}
            </select>
          </div>

          {/* View mode */}
          <div className="flex items-center border border-slate-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 transition-colors ${
                viewMode === 'grid'
                  ? 'bg-slate-700 text-slate-100'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 transition-colors ${
                viewMode === 'list'
                  ? 'bg-slate-700 text-slate-100'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <ImageIcon className="w-12 h-12 text-slate-700 mb-4" />
              <h3 className="text-lg font-medium text-slate-400">No images saved yet</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-md">
                Generate images with AI tools and click &quot;Save&quot; to add them to your library for reuse.
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredImages.map((asset) => (
                <AIImageCard
                  key={asset.id}
                  asset={asset}
                  onUse={canUseImages && onSelectImage ? handleUse : undefined}
                  onDownload={handleDownload}
                  onDelete={handleDelete}
                  canUse={canUseImages && !!onSelectImage}
                  compact
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredImages.map((asset) => (
                <AIImageCard
                  key={asset.id}
                  asset={asset}
                  onUse={canUseImages && onSelectImage ? handleUse : undefined}
                  onDownload={handleDownload}
                  onDelete={handleDelete}
                  canUse={canUseImages && !!onSelectImage}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer with storage info */}
        <div className="border-t border-slate-800 px-6 py-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              {filteredImages.length} of {storageInfo.count} images shown
            </span>
            <div className="flex items-center gap-2">
              <span>Storage: {storagePercent}%</span>
              <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    storagePercent > 80 ? 'bg-amber-500' : 'bg-sky-500'
                  }`}
                  style={{ width: `${Math.min(storagePercent, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AIImageLibraryPanel;

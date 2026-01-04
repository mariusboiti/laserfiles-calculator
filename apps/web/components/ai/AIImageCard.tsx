'use client';

/**
 * AI Image Card Component
 * Displays a single saved AI image with actions
 */

import React, { useState } from 'react';
import { Download, Trash2, Play, MoreVertical, Tag } from 'lucide-react';
import type { AIImageAsset } from '@/lib/ai/aiImageLibrary';

interface AIImageCardProps {
  asset: AIImageAsset;
  onUse?: (asset: AIImageAsset) => void;
  onDownload?: (asset: AIImageAsset) => void;
  onDelete?: (asset: AIImageAsset) => void;
  canUse?: boolean;
  compact?: boolean;
}

export function AIImageCard({
  asset,
  onUse,
  onDownload,
  onDelete,
  canUse = true,
  compact = false,
}: AIImageCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleUse = () => {
    onUse?.(asset);
  };

  const handleDownload = () => {
    onDownload?.(asset);
    setShowMenu(false);
  };

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete?.(asset);
      setConfirmDelete(false);
      setShowMenu(false);
    } else {
      setConfirmDelete(true);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  const thumbnail = asset.thumbnailDataUrl || asset.dataUrl;

  if (compact) {
    return (
      <div className="group relative aspect-square rounded-lg overflow-hidden bg-slate-800 border border-slate-700 hover:border-slate-600 transition-colors">
        <img
          src={thumbnail}
          alt={asset.title || 'AI generated image'}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-slate-900/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          {canUse && onUse && (
            <button
              onClick={handleUse}
              className="p-2 rounded-full bg-sky-600 text-white hover:bg-sky-500 transition-colors"
              title="Use this image"
            >
              <Play className="w-4 h-4" />
            </button>
          )}
          {onDownload && (
            <button
              onClick={handleDownload}
              className="p-2 rounded-full bg-slate-700 text-white hover:bg-slate-600 transition-colors"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={handleDelete}
              className={`p-2 rounded-full transition-colors ${
                confirmDelete
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-700 text-white hover:bg-slate-600'
              }`}
              title={confirmDelete ? 'Click again to confirm' : 'Delete'}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="group rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden hover:border-slate-700 transition-colors">
      {/* Image */}
      <div className="relative aspect-video bg-slate-800">
        <img
          src={thumbnail}
          alt={asset.title || 'AI generated image'}
          className="w-full h-full object-contain"
          loading="lazy"
        />
        
        {/* Tool badge */}
        <div className="absolute top-2 left-2">
          <span className="px-2 py-0.5 rounded-full bg-slate-900/80 text-[10px] text-slate-300 backdrop-blur-sm">
            {asset.toolSlug}
          </span>
        </div>

        {/* Quick actions overlay */}
        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          {canUse && onUse && (
            <button
              onClick={handleUse}
              className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-500 transition-colors flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Use
            </button>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {asset.title && (
              <h4 className="text-sm font-medium text-slate-200 truncate">
                {asset.title}
              </h4>
            )}
            {asset.prompt && (
              <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                {asset.prompt}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-500">
              <span>{formatDate(asset.createdAt)}</span>
              {asset.width && asset.height && (
                <>
                  <span>•</span>
                  <span>{asset.width}×{asset.height}</span>
                </>
              )}
              {asset.provider && (
                <>
                  <span>•</span>
                  <span>{asset.provider}</span>
                </>
              )}
            </div>
          </div>

          {/* Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => {
                    setShowMenu(false);
                    setConfirmDelete(false);
                  }}
                />
                <div className="absolute right-0 top-full mt-1 z-20 w-36 rounded-lg border border-slate-700 bg-slate-800 py-1 shadow-xl">
                  {onDownload && (
                    <button
                      onClick={handleDownload}
                      className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-slate-700 flex items-center gap-2"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={handleDelete}
                      className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 ${
                        confirmDelete
                          ? 'text-red-400 bg-red-900/30'
                          : 'text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {confirmDelete ? 'Confirm delete' : 'Delete'}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tags */}
        {asset.tags && asset.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {asset.tags.map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AIImageCard;

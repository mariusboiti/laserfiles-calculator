'use client';

/**
 * Add From Studio Button
 * Button component that opens the artifact picker for importing into Price Calculator
 */

import { useState, useEffect } from 'react';
import { Package } from 'lucide-react';
import { ArtifactPickerModal } from './ArtifactPickerModal';
import { fetchArtifact, type Artifact } from '@/lib/artifacts/client';

interface AddFromStudioButtonProps {
  onArtifactSelected: (artifact: Artifact) => void;
  className?: string;
}

export function AddFromStudioButton({
  onArtifactSelected,
  className = '',
}: AddFromStudioButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Check for import from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const importId = params.get('importArtifactId');

    if (importId) {
      // Remove query param
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('importArtifactId');
      window.history.replaceState({}, '', newUrl.toString());

      // Fetch and import artifact
      fetchArtifact(importId)
        .then((artifact) => {
          onArtifactSelected(artifact);
        })
        .catch((err) => {
          console.error('Failed to import artifact:', err);
        });
    }

    // Also check sessionStorage
    const stored = sessionStorage.getItem('importArtifact');
    if (stored) {
      sessionStorage.removeItem('importArtifact');
      try {
        const artifact = JSON.parse(stored);
        onArtifactSelected(artifact);
      } catch (err) {
        console.error('Failed to parse stored artifact:', err);
      }
    }
  }, [onArtifactSelected]);

  const handleSelect = (artifact: Artifact) => {
    setIsOpen(false);
    onArtifactSelected(artifact);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-2 rounded-lg border border-sky-500/50 bg-sky-500/10 px-3 py-2 text-sm font-medium text-sky-400 hover:bg-sky-500/20 transition-colors ${className}`}
      >
        <Package className="h-4 w-4" />
        Add from Studio
      </button>

      <ArtifactPickerModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        onSelect={handleSelect}
        title="Import from Studio Library"
      />
    </>
  );
}

/**
 * Map artifact to price calculator item
 */
export function mapArtifactToLineItem(artifact: Artifact): {
  name: string;
  widthMm: number | null;
  heightMm: number | null;
  quantity: number;
  notes: string;
  artifactId: string;
  fileSvgUrl: string | null;
} {
  const meta = artifact.metaJson;
  const bboxMm = meta?.bboxMm;

  return {
    name: artifact.name,
    widthMm: bboxMm?.width ?? null,
    heightMm: bboxMm?.height ?? null,
    quantity: 1,
    notes: `Imported from ${artifact.toolSlug.replace(/-/g, ' ')}`,
    artifactId: artifact.id,
    fileSvgUrl: artifact.fileSvgUrl,
  };
}

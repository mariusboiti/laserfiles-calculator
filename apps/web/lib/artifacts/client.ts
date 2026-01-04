'use client';

/**
 * Artifact Client Utilities
 * Functions for interacting with the artifacts API from the client
 */

export interface ArtifactMeta {
  bboxMm?: { width: number; height: number };
  operations?: {
    hasCuts?: boolean;
    hasScores?: boolean;
    hasEngraves?: boolean;
  };
  pathCount?: number;
  thickness?: number;
  kerf?: number;
  notes?: string;
  [key: string]: unknown;
}

export interface Artifact {
  id: string;
  name: string;
  toolSlug: string;
  description: string | null;
  fileSvgUrl: string | null;
  fileDxfUrl: string | null;
  filePdfUrl: string | null;
  previewPngUrl: string | null;
  metaJson: ArtifactMeta | null;
  createdAt: string;
}

export interface CreateArtifactParams {
  toolSlug: string;
  name: string;
  description?: string;
  svg?: string;
  dxfBase64?: string;
  pdfBase64?: string;
  previewPngBase64?: string;
  meta?: Partial<ArtifactMeta>;
}

export interface FetchArtifactsParams {
  q?: string;
  toolSlug?: string;
  limit?: number;
  cursor?: string;
}

export interface FetchArtifactsResult {
  artifacts: Artifact[];
  nextCursor: string | null;
}

/**
 * Fetch artifacts from the API
 */
export async function fetchArtifacts(
  params: FetchArtifactsParams = {}
): Promise<FetchArtifactsResult> {
  const searchParams = new URLSearchParams();
  
  if (params.q) searchParams.set('q', params.q);
  if (params.toolSlug) searchParams.set('toolSlug', params.toolSlug);
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.cursor) searchParams.set('cursor', params.cursor);

  const url = `/api/artifacts${searchParams.toString() ? `?${searchParams}` : ''}`;
  
  const response = await fetch(url);
  const result = await response.json();

  if (!result.ok) {
    throw new Error(result.error?.message || 'Failed to fetch artifacts');
  }

  return {
    artifacts: result.data.artifacts,
    nextCursor: result.data.nextCursor,
  };
}

/**
 * Fetch a single artifact by ID
 */
export async function fetchArtifact(id: string): Promise<Artifact> {
  const response = await fetch(`/api/artifacts/${id}`);
  const result = await response.json();

  if (!result.ok) {
    throw new Error(result.error?.message || 'Failed to fetch artifact');
  }

  return result.data;
}

/**
 * Create a new artifact
 */
export async function createArtifact(params: CreateArtifactParams): Promise<Artifact> {
  const response = await fetch('/api/artifacts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  const result = await response.json();

  if (!result.ok) {
    throw new Error(result.error?.message || 'Failed to create artifact');
  }

  return result.data;
}

/**
 * Delete an artifact
 */
export async function deleteArtifact(id: string): Promise<boolean> {
  const response = await fetch(`/api/artifacts/${id}`, {
    method: 'DELETE',
  });

  const result = await response.json();

  if (!result.ok) {
    throw new Error(result.error?.message || 'Failed to delete artifact');
  }

  return true;
}

/**
 * Get tool display name from slug
 */
export function getToolDisplayName(toolSlug: string): string {
  const toolNames: Record<string, string> = {
    'boxmaker': 'BoxMaker',
    'engrave-prep': 'EngravePrep',
    'panel-splitter': 'Panel Splitter',
    'personalised-sign-generator': 'Sign Generator',
    'qr-generator': 'QR Generator',
    'living-hinge': 'Living Hinge',
    'multilayer': 'Multilayer Tool',
    'text-to-path': 'Text to Path',
    'puzzle-maker': 'Puzzle Maker',
    'ai-depth-photo': 'AI Depth Photo',
  };

  return toolNames[toolSlug] || toolSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Format dimensions for display
 */
export function formatDimensions(meta: ArtifactMeta | null): string {
  if (!meta?.bboxMm) return 'Unknown size';
  const { width, height } = meta.bboxMm;
  return `${width.toFixed(1)} × ${height.toFixed(1)} mm`;
}

/**
 * Navigate to price calculator with artifact import
 */
export function addToPriceCalculator(artifact: Artifact): void {
  // Store artifact in sessionStorage for import
  sessionStorage.setItem('importArtifact', JSON.stringify(artifact));
  
  // Navigate to price calculator
  window.location.href = `/studio/tools/price-calculator/quotes?importArtifactId=${artifact.id}`;
}

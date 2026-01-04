/**
 * Artifact Service - Server Side
 * Manages creation, listing, and retrieval of artifacts
 */

import { PrismaClient } from '@prisma/client';
import { storeFile, generateArtifactKey } from '../storage/server';
import { sanitizeSvg, extractSvgMeta, type SvgMeta } from './svg';

// Prisma client singleton
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Use dynamic access for new models
const db = prisma as any;

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
  userId: string;
  toolSlug: string;
  name: string;
  description: string | null;
  fileSvgUrl: string | null;
  fileDxfUrl: string | null;
  filePdfUrl: string | null;
  previewPngUrl: string | null;
  metaJson: ArtifactMeta | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateArtifactInput {
  toolSlug: string;
  name: string;
  description?: string;
  svg?: string;
  dxfBytes?: Uint8Array;
  pdfBytes?: Uint8Array;
  previewPngBytes?: Uint8Array;
  meta?: Partial<ArtifactMeta>;
}

export interface ListArtifactsParams {
  q?: string;
  toolSlug?: string;
  limit?: number;
  cursor?: string;
}

/**
 * Create an artifact from exported files
 */
export async function createArtifactFromExport(
  userId: string,
  input: CreateArtifactInput
): Promise<Artifact> {
  const { toolSlug, name, description, svg, dxfBytes, pdfBytes, previewPngBytes, meta } = input;

  // Generate artifact ID first so we can use it in file paths
  const artifactId = generateId();

  // Process and store SVG
  let fileSvgUrl: string | null = null;
  let svgMeta: SvgMeta | null = null;

  if (svg) {
    const sanitizedSvg = sanitizeSvg(svg);
    svgMeta = extractSvgMeta(sanitizedSvg);

    const svgBytes = new TextEncoder().encode(sanitizedSvg);
    const key = generateArtifactKey({ userId, artifactId, filename: 'design.svg' });
    fileSvgUrl = await storeFile({ key, contentType: 'image/svg+xml', bytes: svgBytes });
  }

  // Store DXF if provided
  let fileDxfUrl: string | null = null;
  if (dxfBytes && dxfBytes.length > 0) {
    const key = generateArtifactKey({ userId, artifactId, filename: 'design.dxf' });
    fileDxfUrl = await storeFile({ key, contentType: 'application/dxf', bytes: dxfBytes });
  }

  // Store PDF if provided
  let filePdfUrl: string | null = null;
  if (pdfBytes && pdfBytes.length > 0) {
    const key = generateArtifactKey({ userId, artifactId, filename: 'design.pdf' });
    filePdfUrl = await storeFile({ key, contentType: 'application/pdf', bytes: pdfBytes });
  }

  // Store preview PNG if provided
  let previewPngUrl: string | null = null;
  if (previewPngBytes && previewPngBytes.length > 0) {
    const key = generateArtifactKey({ userId, artifactId, filename: 'preview.png' });
    previewPngUrl = await storeFile({ key, contentType: 'image/png', bytes: previewPngBytes });
  }

  // Merge SVG meta with provided meta
  const finalMeta: ArtifactMeta = {
    ...meta,
  };

  if (svgMeta) {
    if (svgMeta.bboxMm && !finalMeta.bboxMm) {
      finalMeta.bboxMm = svgMeta.bboxMm;
    }
    if (!finalMeta.operations) {
      finalMeta.operations = {
        hasCuts: svgMeta.hasCuts,
        hasScores: svgMeta.hasScores,
        hasEngraves: svgMeta.hasEngraves,
      };
    }
    if (svgMeta.pathCount && !finalMeta.pathCount) {
      finalMeta.pathCount = svgMeta.pathCount;
    }
  }

  // Create artifact in database
  try {
    const artifact = await db.artifact.create({
      data: {
        id: artifactId,
        userId,
        toolSlug,
        name,
        description: description || null,
        fileSvgUrl,
        fileDxfUrl,
        filePdfUrl,
        previewPngUrl,
        metaJson: finalMeta,
      },
    });

    return artifact as Artifact;
  } catch (error) {
    console.error('Failed to create artifact:', error);
    throw new Error('Failed to save artifact to library');
  }
}

/**
 * List artifacts for a user
 */
export async function listArtifacts(
  userId: string,
  params: ListArtifactsParams = {}
): Promise<{ artifacts: Artifact[]; nextCursor: string | null }> {
  const { q, toolSlug, limit = 20, cursor } = params;

  try {
    const where: any = { userId };

    if (toolSlug) {
      where.toolSlug = toolSlug;
    }

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const artifacts = await db.artifact.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    let nextCursor: string | null = null;
    if (artifacts.length > limit) {
      const nextItem = artifacts.pop();
      nextCursor = nextItem?.id || null;
    }

    return {
      artifacts: artifacts as Artifact[],
      nextCursor,
    };
  } catch (error) {
    console.error('Failed to list artifacts:', error);
    return { artifacts: [], nextCursor: null };
  }
}

/**
 * Get a single artifact by ID (with ownership check)
 */
export async function getArtifact(
  userId: string,
  artifactId: string
): Promise<Artifact | null> {
  try {
    const artifact = await db.artifact.findFirst({
      where: {
        id: artifactId,
        userId,
      },
    });

    return artifact as Artifact | null;
  } catch (error) {
    console.error('Failed to get artifact:', error);
    return null;
  }
}

/**
 * Delete an artifact (with ownership check)
 */
export async function deleteArtifact(
  userId: string,
  artifactId: string
): Promise<boolean> {
  try {
    const result = await db.artifact.deleteMany({
      where: {
        id: artifactId,
        userId,
      },
    });

    return result.count > 0;
  } catch (error) {
    console.error('Failed to delete artifact:', error);
    return false;
  }
}

/**
 * Get recent artifacts for a user
 */
export async function getRecentArtifacts(
  userId: string,
  limit: number = 5
): Promise<Artifact[]> {
  try {
    const artifacts = await db.artifact.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return artifacts as Artifact[];
  } catch (error) {
    console.error('Failed to get recent artifacts:', error);
    return [];
  }
}

/**
 * Generate a unique ID (cuid-like)
 */
function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `art_${timestamp}${randomPart}`;
}

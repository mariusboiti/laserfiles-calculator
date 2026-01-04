/**
 * AI Image Library - Shared Storage Layer
 * Persists AI-generated images for reuse across all AI-powered tools
 * Uses localStorage with size limits and compression
 */

// ============================================================================
// Types
// ============================================================================

export interface AIImageAsset {
  id: string;
  createdAt: number;
  toolSlug: string;
  title?: string;
  prompt?: string;
  provider?: string;
  width?: number;
  height?: number;
  mime: 'image/png' | 'image/jpeg' | 'image/webp';
  dataUrl: string;
  thumbnailDataUrl?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export type AIImageAssetInput = Omit<AIImageAsset, 'id' | 'createdAt'>;

export interface AIImageFilter {
  toolSlug?: string;
  search?: string;
  tags?: string[];
}

export interface StorageInfo {
  count: number;
  maxCount: number;
  estimatedSizeKB: number;
  maxSizeKB: number;
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'lfs_ai_images_v1';
const STORAGE_VERSION = 1;
const MAX_IMAGES = 100;
const MAX_STORAGE_KB = 50 * 1024; // 50MB limit
const THUMBNAIL_SIZE = 150;
const MAX_IMAGE_SIZE_KB = 2048; // 2MB per image max

// ============================================================================
// Utility Functions
// ============================================================================

function generateId(): string {
  return `ai_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function estimateDataUrlSizeKB(dataUrl: string): number {
  return Math.round((dataUrl.length * 0.75) / 1024);
}

/**
 * Compress image to WebP format with reduced quality
 */
async function compressImage(
  dataUrl: string,
  maxWidth: number = 1024,
  quality: number = 0.8
): Promise<{ dataUrl: string; width: number; height: number; mime: 'image/webp' }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      // Scale down if needed
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      const compressed = canvas.toDataURL('image/webp', quality);
      resolve({
        dataUrl: compressed,
        width,
        height,
        mime: 'image/webp',
      });
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

/**
 * Create thumbnail from image
 */
async function createThumbnail(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      // Scale to thumbnail size
      const scale = Math.min(THUMBNAIL_SIZE / width, THUMBNAIL_SIZE / height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/webp', 0.6));
    };
    img.onerror = () => reject(new Error('Failed to create thumbnail'));
    img.src = dataUrl;
  });
}

// ============================================================================
// Storage Functions
// ============================================================================

interface StorageData {
  version: number;
  images: AIImageAsset[];
}

function loadStorage(): StorageData {
  if (typeof window === 'undefined') {
    return { version: STORAGE_VERSION, images: [] };
  }

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return { version: STORAGE_VERSION, images: [] };
    }

    const parsed = JSON.parse(data) as StorageData;
    
    // Version migration if needed
    if (parsed.version !== STORAGE_VERSION) {
      // Future migrations go here
    }

    return parsed;
  } catch {
    return { version: STORAGE_VERSION, images: [] };
  }
}

function saveStorage(data: StorageData): boolean {
  if (typeof window === 'undefined') return false;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    // Storage quota exceeded
    console.warn('AI Image Library: Storage quota exceeded');
    return false;
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * List all images with optional filter
 */
export function listImages(filter?: AIImageFilter): AIImageAsset[] {
  const { images } = loadStorage();

  let filtered = images;

  if (filter?.toolSlug) {
    filtered = filtered.filter((img) => img.toolSlug === filter.toolSlug);
  }

  if (filter?.search) {
    const searchLower = filter.search.toLowerCase();
    filtered = filtered.filter((img) => {
      const searchable = [img.title, img.prompt, ...(img.tags || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return searchable.includes(searchLower);
    });
  }

  if (filter?.tags && filter.tags.length > 0) {
    filtered = filtered.filter((img) =>
      filter.tags!.some((tag) => img.tags?.includes(tag))
    );
  }

  // Sort by createdAt descending (newest first)
  return filtered.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Get a single image by ID
 */
export function getImage(id: string): AIImageAsset | null {
  const { images } = loadStorage();
  return images.find((img) => img.id === id) || null;
}

/**
 * Save a new image to the library
 * Automatically compresses and creates thumbnail
 */
export async function saveImage(
  input: AIImageAssetInput
): Promise<{ success: true; asset: AIImageAsset } | { success: false; error: string }> {
  try {
    const storage = loadStorage();

    // Check count limit
    if (storage.images.length >= MAX_IMAGES) {
      // Remove oldest images
      const toRemove = storage.images.length - MAX_IMAGES + 1;
      storage.images = storage.images
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, -toRemove);
    }

    // Compress image if needed
    let { dataUrl, width, height, mime } = input;
    const originalSizeKB = estimateDataUrlSizeKB(dataUrl);

    if (originalSizeKB > MAX_IMAGE_SIZE_KB || mime !== 'image/webp') {
      try {
        const compressed = await compressImage(dataUrl, 1024, 0.85);
        dataUrl = compressed.dataUrl;
        width = compressed.width;
        height = compressed.height;
        mime = compressed.mime;
      } catch {
        // Keep original if compression fails
      }
    }

    // Create thumbnail
    let thumbnailDataUrl: string | undefined;
    try {
      thumbnailDataUrl = await createThumbnail(dataUrl);
    } catch {
      // Continue without thumbnail
    }

    const asset: AIImageAsset = {
      ...input,
      id: generateId(),
      createdAt: Date.now(),
      dataUrl,
      thumbnailDataUrl,
      width,
      height,
      mime,
    };

    storage.images.unshift(asset);

    // Check total size
    const totalSize = JSON.stringify(storage).length / 1024;
    if (totalSize > MAX_STORAGE_KB) {
      // Remove oldest images until under limit
      while (
        storage.images.length > 1 &&
        JSON.stringify(storage).length / 1024 > MAX_STORAGE_KB
      ) {
        storage.images.pop();
      }
    }

    const saved = saveStorage(storage);
    if (!saved) {
      return {
        success: false,
        error: 'Storage is full. Please delete some saved images.',
      };
    }

    return { success: true, asset };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Failed to save image',
    };
  }
}

/**
 * Delete an image by ID
 */
export function deleteImage(id: string): boolean {
  const storage = loadStorage();
  const index = storage.images.findIndex((img) => img.id === id);

  if (index === -1) return false;

  storage.images.splice(index, 1);
  return saveStorage(storage);
}

/**
 * Update an image's metadata
 */
export function updateImage(
  id: string,
  patch: Partial<Pick<AIImageAsset, 'title' | 'tags' | 'metadata'>>
): AIImageAsset | null {
  const storage = loadStorage();
  const index = storage.images.findIndex((img) => img.id === id);

  if (index === -1) return null;

  storage.images[index] = {
    ...storage.images[index],
    ...patch,
  };

  if (!saveStorage(storage)) return null;

  return storage.images[index];
}

/**
 * Get storage usage information
 */
export function getStorageInfo(): StorageInfo {
  const storage = loadStorage();
  const dataStr = localStorage.getItem(STORAGE_KEY) || '';

  return {
    count: storage.images.length,
    maxCount: MAX_IMAGES,
    estimatedSizeKB: Math.round(dataStr.length / 1024),
    maxSizeKB: MAX_STORAGE_KB,
  };
}

/**
 * Clear all images from the library
 */
export function clearLibrary(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Get unique tool slugs in library
 */
export function getToolSlugs(): string[] {
  const { images } = loadStorage();
  return [...new Set(images.map((img) => img.toolSlug))];
}

/**
 * Download image as file
 */
export function downloadImage(asset: AIImageAsset, filename?: string): void {
  const link = document.createElement('a');
  link.href = asset.dataUrl;
  link.download = filename || `${asset.title || 'ai-image'}-${asset.id.slice(-6)}.webp`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

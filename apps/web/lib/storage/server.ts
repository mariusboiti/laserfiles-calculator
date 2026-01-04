/**
 * Storage Abstraction - Server Side
 * Default implementation: local dev storage under /public/uploads
 * Easily swappable to S3/R2/etc.
 */

import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export interface StorageProvider {
  putObject(params: {
    key: string;
    contentType: string;
    bytes: Uint8Array;
  }): Promise<{ url: string }>;
  
  deleteObject?(key: string): Promise<void>;
}

/**
 * Local file system storage provider
 * Stores files in apps/web/public/uploads/
 * Returns URLs like /uploads/{key}
 */
class LocalStorageProvider implements StorageProvider {
  private uploadsDir: string;

  constructor() {
    // Resolve to public/uploads directory
    this.uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  }

  async putObject(params: { key: string; contentType: string; bytes: Uint8Array }): Promise<{ url: string }> {
    const { key, bytes } = params;

    // Ensure uploads directory exists
    if (!existsSync(this.uploadsDir)) {
      await mkdir(this.uploadsDir, { recursive: true });
    }

    // Create subdirectories if key contains path separators
    const fullPath = path.join(this.uploadsDir, key);
    const dir = path.dirname(fullPath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    // Write file
    await writeFile(fullPath, Buffer.from(bytes));

    // Return public URL
    const url = `/uploads/${key}`;
    return { url };
  }

  async deleteObject(key: string): Promise<void> {
    const { unlink } = await import('fs/promises');
    const fullPath = path.join(this.uploadsDir, key);
    try {
      await unlink(fullPath);
    } catch (e) {
      // Ignore if file doesn't exist
    }
  }
}

// Singleton storage instance
let storageInstance: StorageProvider | null = null;

/**
 * Get storage provider instance
 * Can be extended to support S3/R2 based on env vars
 */
export function getStorage(): StorageProvider {
  if (!storageInstance) {
    // Future: check env vars for S3/R2 config and return appropriate provider
    // if (process.env.S3_BUCKET) {
    //   storageInstance = new S3StorageProvider();
    // } else {
    storageInstance = new LocalStorageProvider();
    // }
  }
  return storageInstance;
}

/**
 * Store a file and return its public URL
 */
export async function storeFile(params: {
  key: string;
  contentType: string;
  bytes: Uint8Array;
}): Promise<string> {
  const storage = getStorage();
  const result = await storage.putObject(params);
  return result.url;
}

/**
 * Generate a unique key for artifact files
 */
export function generateArtifactKey(params: {
  userId: string;
  artifactId: string;
  filename: string;
}): string {
  const { userId, artifactId, filename } = params;
  // Structure: artifacts/{userId}/{artifactId}/{filename}
  return `artifacts/${userId}/${artifactId}/${filename}`;
}

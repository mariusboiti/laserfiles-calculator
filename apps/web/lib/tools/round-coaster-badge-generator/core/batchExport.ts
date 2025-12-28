/**
 * Round Coaster & Badge Generator V3 - Batch Export (PRO)
 * Generate multiple SVGs from a list of texts
 */

import type { CoasterStateV2 } from '../types/coasterV2';
import { buildCoasterSvgV2, generateFilename } from './generateSvgV2';

export interface BatchItem {
  id: string;
  text: string;
  svg?: string;
  filename?: string;
  error?: string;
}

export interface BatchConfig {
  enabled: boolean;
  textList: string[];
  autoIncrement: boolean;
  incrementStart: number;
  incrementPadding: number; // 3 = 001, 002, etc.
  prefixText: string;
  suffixText: string;
}

export const DEFAULT_BATCH_CONFIG: BatchConfig = {
  enabled: false,
  textList: [],
  autoIncrement: false,
  incrementStart: 1,
  incrementPadding: 3,
  prefixText: '',
  suffixText: '',
};

/**
 * Parse text list from textarea (one name per line)
 */
export function parseTextList(input: string): string[] {
  return input
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

/**
 * Generate text with auto-increment
 */
export function generateIncrementedText(
  prefix: string,
  index: number,
  padding: number,
  suffix: string
): string {
  const num = index.toString().padStart(padding, '0');
  return `${prefix}${num}${suffix}`;
}

/**
 * Generate batch items from config
 */
export function generateBatchItems(
  baseState: CoasterStateV2,
  config: BatchConfig
): BatchItem[] {
  const items: BatchItem[] = [];
  
  if (config.autoIncrement) {
    // Generate sequential items
    const count = config.textList.length > 0 ? config.textList.length : 10;
    for (let i = 0; i < count; i++) {
      const text = generateIncrementedText(
        config.prefixText,
        config.incrementStart + i,
        config.incrementPadding,
        config.suffixText
      );
      items.push({
        id: `batch-${i}`,
        text,
      });
    }
  } else {
    // Use provided text list
    config.textList.forEach((text, i) => {
      items.push({
        id: `batch-${i}`,
        text: `${config.prefixText}${text}${config.suffixText}`,
      });
    });
  }
  
  return items;
}

/**
 * Build SVGs for batch items
 */
export function buildBatchSvgs(
  baseState: CoasterStateV2,
  items: BatchItem[]
): BatchItem[] {
  return items.map(item => {
    try {
      // Create state with updated text
      const state: CoasterStateV2 = {
        ...baseState,
        text: {
          ...baseState.text,
          center: item.text,
        },
      };
      
      const result = buildCoasterSvgV2(state);
      const filename = generateFilename(state);
      
      return {
        ...item,
        svg: result.svg,
        filename,
      };
    } catch (e) {
      return {
        ...item,
        error: e instanceof Error ? e.message : 'Failed to generate',
      };
    }
  });
}

/**
 * Download single SVG file
 */
export function downloadSvg(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download batch items sequentially (FREE version)
 * Downloads one file at a time with delay
 */
export async function downloadBatchSequential(
  items: BatchItem[],
  delayMs: number = 500
): Promise<void> {
  for (const item of items) {
    if (item.svg && item.filename) {
      downloadSvg(item.svg, item.filename);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

/**
 * Create ZIP file from batch items (PRO version)
 * Returns blob for download
 */
export async function createBatchZip(
  items: BatchItem[]
): Promise<Blob | null> {
  // Check if JSZip is available
  try {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    
    for (const item of items) {
      if (item.svg && item.filename) {
        zip.file(item.filename, item.svg);
      }
    }
    
    return await zip.generateAsync({ type: 'blob' });
  } catch {
    // JSZip not available - fallback to sequential
    console.warn('JSZip not available, falling back to sequential download');
    return null;
  }
}

/**
 * Download ZIP file
 */
export function downloadZip(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export batch - tries ZIP first (PRO), falls back to sequential (FREE)
 */
export async function exportBatch(
  items: BatchItem[],
  zipFilename: string = 'coasters-batch.zip',
  isPro: boolean = false
): Promise<{ method: 'zip' | 'sequential'; count: number }> {
  const validItems = items.filter(i => i.svg && i.filename);
  
  if (validItems.length === 0) {
    throw new Error('No valid items to export');
  }
  
  if (isPro) {
    const zipBlob = await createBatchZip(validItems);
    if (zipBlob) {
      downloadZip(zipBlob, zipFilename);
      return { method: 'zip', count: validItems.length };
    }
  }
  
  // Fallback to sequential
  await downloadBatchSequential(validItems);
  return { method: 'sequential', count: validItems.length };
}

/**
 * Estimate batch generation time
 */
export function estimateBatchTime(count: number): string {
  const msPerItem = 50; // rough estimate
  const totalMs = count * msPerItem;
  
  if (totalMs < 1000) {
    return 'instant';
  } else if (totalMs < 5000) {
    return 'a few seconds';
  } else {
    return `~${Math.ceil(totalMs / 1000)} seconds`;
  }
}

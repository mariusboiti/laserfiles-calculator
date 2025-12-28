/**
 * Keychain Generator V2 - Preset Manager
 * Save/Load/Delete presets using localStorage
 */

import type { KeychainConfigV2, KeychainPresetV2 } from '../types/keychainV2';
import { DEFAULT_PRESETS } from '../config/defaultsV2';

const STORAGE_KEY = 'lfs_keychain_presets_v1';

/**
 * Get all presets (default + user)
 */
export function getAllPresets(): KeychainPresetV2[] {
  const userPresets = getUserPresets();
  return [...DEFAULT_PRESETS, ...userPresets];
}

/**
 * Get user-saved presets from localStorage
 */
export function getUserPresets(): KeychainPresetV2[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isValidPreset);
  } catch {
    return [];
  }
}

/**
 * Save a new preset
 */
export function savePreset(name: string, config: Partial<KeychainConfigV2>): KeychainPresetV2 {
  const presets = getUserPresets();

  // Check for duplicate name
  const existingIndex = presets.findIndex(p => p.name.toLowerCase() === name.toLowerCase());

  const newPreset: KeychainPresetV2 = {
    name: name.trim(),
    values: config,
    createdAt: Date.now(),
    isDefault: false,
  };

  if (existingIndex >= 0) {
    // Update existing
    presets[existingIndex] = newPreset;
  } else {
    // Add new
    presets.push(newPreset);
  }

  saveUserPresets(presets);
  return newPreset;
}

/**
 * Delete a preset by name
 */
export function deletePreset(name: string): boolean {
  const presets = getUserPresets();
  const filtered = presets.filter(p => p.name.toLowerCase() !== name.toLowerCase());

  if (filtered.length === presets.length) {
    return false; // Not found
  }

  saveUserPresets(filtered);
  return true;
}

/**
 * Rename a preset
 */
export function renamePreset(oldName: string, newName: string): boolean {
  const presets = getUserPresets();
  const index = presets.findIndex(p => p.name.toLowerCase() === oldName.toLowerCase());

  if (index < 0) return false;

  presets[index] = { ...presets[index], name: newName.trim() };
  saveUserPresets(presets);
  return true;
}

/**
 * Get preset by name
 */
export function getPresetByName(name: string): KeychainPresetV2 | null {
  const allPresets = getAllPresets();
  return allPresets.find(p => p.name.toLowerCase() === name.toLowerCase()) || null;
}

/**
 * Apply preset to current config
 */
export function applyPreset(preset: KeychainPresetV2, currentConfig: KeychainConfigV2): KeychainConfigV2 {
  return {
    ...currentConfig,
    ...preset.values,
    hole: preset.values.hole ? { ...currentConfig.hole, ...preset.values.hole } : currentConfig.hole,
    text: preset.values.text ? { ...currentConfig.text, ...preset.values.text } : currentConfig.text,
    render: preset.values.render ? { ...currentConfig.render, ...preset.values.render } : currentConfig.render,
    preview: preset.values.preview ? { ...currentConfig.preview, ...preset.values.preview } : currentConfig.preview,
    customShape: preset.values.customShape ? { ...currentConfig.customShape, ...preset.values.customShape } : currentConfig.customShape,
    batch: preset.values.batch ? { ...currentConfig.batch, ...preset.values.batch } : currentConfig.batch,
  };
}

/**
 * Export presets as JSON string
 */
export function exportPresets(): string {
  const presets = getUserPresets();
  return JSON.stringify(presets, null, 2);
}

/**
 * Import presets from JSON string
 */
export function importPresets(json: string, merge: boolean = true): number {
  try {
    const imported = JSON.parse(json);
    if (!Array.isArray(imported)) return 0;

    const validPresets = imported.filter(isValidPreset);

    if (merge) {
      const existing = getUserPresets();
      const merged = [...existing];

      for (const preset of validPresets) {
        const existingIndex = merged.findIndex(p => p.name.toLowerCase() === preset.name.toLowerCase());
        if (existingIndex >= 0) {
          merged[existingIndex] = preset;
        } else {
          merged.push(preset);
        }
      }

      saveUserPresets(merged);
      return validPresets.length;
    } else {
      saveUserPresets(validPresets);
      return validPresets.length;
    }
  } catch {
    return 0;
  }
}

/**
 * Clear all user presets
 */
export function clearUserPresets(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

// ============ Internal Helpers ============

function saveUserPresets(presets: KeychainPresetV2[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch (e) {
    console.error('Failed to save presets:', e);
  }
}

function isValidPreset(obj: unknown): obj is KeychainPresetV2 {
  if (!obj || typeof obj !== 'object') return false;

  const p = obj as Record<string, unknown>;
  return (
    typeof p.name === 'string' &&
    p.name.trim().length > 0 &&
    typeof p.values === 'object' &&
    p.values !== null &&
    typeof p.createdAt === 'number'
  );
}

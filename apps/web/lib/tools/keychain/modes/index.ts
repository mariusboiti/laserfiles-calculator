/**
 * Keychain Hub V2 - Mode Registry
 * Central registry for all keychain modes (PRO with text-to-path)
 */

import type { KeychainMode, KeychainModeId } from '../types';

// V1 modes (legacy, uses <text> elements)
import { simpleMode, SIMPLE_DEFAULTS } from './simple';
import { emojiNameMode, EMOJI_NAME_DEFAULTS } from './emojiName';

// V2 modes (PRO, uses text-to-path with opentype.js)
import { simpleModeV2, SIMPLE_V2_DEFAULTS } from './simpleV2';
import { emojiNameModeV2, EMOJI_NAME_V2_DEFAULTS } from './emojiNameV2';

// Mode registry (V2 PRO modes)
export const MODES: Record<KeychainModeId, KeychainMode> = {
  'simple': simpleModeV2,
  'emoji-name': emojiNameModeV2,
};

// Legacy V1 modes (for fallback)
export const MODES_V1: Record<'simple' | 'emoji-name', KeychainMode> = {
  'simple': simpleMode,
  'emoji-name': emojiNameMode,
};

// Mode list for UI
export const MODE_LIST: { id: KeychainModeId; label: string; description: string; icon: string }[] = [
  { id: 'simple', label: 'Simple', description: 'Basic shape with text', icon: 'tag' },
  { id: 'emoji-name', label: 'Emoji + Name', description: '2-layer with icon', icon: 'smile' },
];

// Get mode by ID
export function getMode(id: KeychainModeId): KeychainMode {
  return MODES[id] || MODES['simple'];
}

// Get default state for mode
export function getModeDefaults(id: KeychainModeId): any {
  const mode = getMode(id);
  return mode.defaults;
}

// Get all mode IDs
export function getModeIds(): KeychainModeId[] {
  return Object.keys(MODES) as KeychainModeId[];
}

// Re-export defaults (V2 as primary)
export { SIMPLE_V2_DEFAULTS, EMOJI_NAME_V2_DEFAULTS };

// Legacy exports
export { SIMPLE_DEFAULTS, EMOJI_NAME_DEFAULTS };

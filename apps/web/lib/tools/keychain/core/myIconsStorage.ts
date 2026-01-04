/**
 * Keychain Hub - My Icons Storage
 * Persist user icons (uploads + AI generated) in localStorage
 */

export interface MyIcon {
  id: string;
  name: string;
  source: 'upload' | 'ai';
  svg: string;
  paths: string[];
  prompt?: string; // For AI icons
  style?: string; // For AI icons
  createdAt: number;
}

const STORAGE_KEY = 'lfs_my_icons_v1';
const MAX_ICONS = 50; // Limit to prevent localStorage bloat

/**
 * Generate unique ID
 */
function generateId(): string {
  return `icon_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Get all saved icons
 */
export function getMyIcons(): MyIcon[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    const icons = JSON.parse(data) as MyIcon[];
    // Sort by createdAt descending (newest first)
    return icons.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

/**
 * Save icon to storage
 */
export function saveMyIcon(icon: Omit<MyIcon, 'id' | 'createdAt'>): MyIcon {
  const icons = getMyIcons();
  
  const newIcon: MyIcon = {
    ...icon,
    id: generateId(),
    createdAt: Date.now(),
  };
  
  // Add to beginning
  icons.unshift(newIcon);
  
  // Limit total icons
  const trimmed = icons.slice(0, MAX_ICONS);
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    // localStorage full - try removing oldest icons
    const reduced = trimmed.slice(0, Math.floor(MAX_ICONS / 2));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reduced));
    } catch {
      console.warn('Could not save icon to localStorage');
    }
  }
  
  return newIcon;
}

/**
 * Delete icon from storage
 */
export function deleteMyIcon(id: string): boolean {
  const icons = getMyIcons();
  const filtered = icons.filter(i => i.id !== id);
  
  if (filtered.length === icons.length) {
    return false; // Icon not found
  }
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch {
    return false;
  }
}

/**
 * Update icon in storage
 */
export function updateMyIcon(id: string, updates: Partial<Omit<MyIcon, 'id' | 'createdAt'>>): MyIcon | null {
  const icons = getMyIcons();
  const index = icons.findIndex(i => i.id === id);
  
  if (index === -1) return null;
  
  const updated = { ...icons[index], ...updates };
  icons[index] = updated;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(icons));
    return updated;
  } catch {
    return null;
  }
}

/**
 * Get icon by ID
 */
export function getMyIconById(id: string): MyIcon | null {
  const icons = getMyIcons();
  return icons.find(i => i.id === id) || null;
}

/**
 * Clear all saved icons
 */
export function clearMyIcons(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Get icons by source
 */
export function getMyIconsBySource(source: 'upload' | 'ai'): MyIcon[] {
  return getMyIcons().filter(i => i.source === source);
}

/**
 * Check if icon ID is a "My Icon"
 */
export function isMyIcon(id: string): boolean {
  return id.startsWith('icon_') || id.startsWith('upload-') || id.startsWith('ai-');
}

/**
 * Get storage usage info
 */
export function getStorageInfo(): { count: number; maxCount: number; estimatedSizeKB: number } {
  const icons = getMyIcons();
  const data = localStorage.getItem(STORAGE_KEY) || '';
  
  return {
    count: icons.length,
    maxCount: MAX_ICONS,
    estimatedSizeKB: Math.round(data.length / 1024 * 10) / 10,
  };
}

/**
 * Centralized project storage system for all tools.
 * Supports save, load, list, delete, and auto-save functionality.
 */

export interface SavedProject<T = unknown> {
  id: string;
  toolId: string;
  name: string;
  data: T;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface ProjectMetadata {
  id: string;
  toolId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY_PREFIX = 'lf_project_';
const PROJECTS_INDEX_KEY = 'lf_projects_index';
const AUTO_SAVE_KEY_PREFIX = 'lf_autosave_';
const PROJECT_VERSION = 1;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getStorageKey(id: string): string {
  return `${STORAGE_KEY_PREFIX}${id}`;
}

function getAutoSaveKey(toolId: string): string {
  return `${AUTO_SAVE_KEY_PREFIX}${toolId}`;
}

/**
 * Get all project metadata (without full data) for listing
 */
export function listProjects(toolId?: string): ProjectMetadata[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const indexJson = localStorage.getItem(PROJECTS_INDEX_KEY);
    const index: ProjectMetadata[] = indexJson ? JSON.parse(indexJson) : [];
    
    if (toolId) {
      return index.filter(p => p.toolId === toolId);
    }
    return index;
  } catch {
    return [];
  }
}

/**
 * Save a new project or update existing one
 */
export function saveProject<T>(
  toolId: string,
  name: string,
  data: T,
  existingId?: string
): SavedProject<T> {
  if (typeof window === 'undefined') {
    throw new Error('Cannot save project: not in browser');
  }

  const now = new Date().toISOString();
  const id = existingId || generateId();
  
  const project: SavedProject<T> = {
    id,
    toolId,
    name,
    data,
    createdAt: existingId ? (loadProject<T>(id)?.createdAt || now) : now,
    updatedAt: now,
    version: PROJECT_VERSION,
  };

  // Save project data
  localStorage.setItem(getStorageKey(id), JSON.stringify(project));

  // Update index
  const index = listProjects();
  const existingIndex = index.findIndex(p => p.id === id);
  
  const metadata: ProjectMetadata = {
    id: project.id,
    toolId: project.toolId,
    name: project.name,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };

  if (existingIndex >= 0) {
    index[existingIndex] = metadata;
  } else {
    index.unshift(metadata);
  }

  localStorage.setItem(PROJECTS_INDEX_KEY, JSON.stringify(index));

  return project;
}

/**
 * Load a project by ID
 */
export function loadProject<T>(id: string): SavedProject<T> | null {
  if (typeof window === 'undefined') return null;

  try {
    const json = localStorage.getItem(getStorageKey(id));
    if (!json) return null;
    return JSON.parse(json) as SavedProject<T>;
  } catch {
    return null;
  }
}

/**
 * Delete a project by ID
 */
export function deleteProject(id: string): boolean {
  if (typeof window === 'undefined') return false;

  try {
    localStorage.removeItem(getStorageKey(id));

    const index = listProjects();
    const filtered = index.filter(p => p.id !== id);
    localStorage.setItem(PROJECTS_INDEX_KEY, JSON.stringify(filtered));

    return true;
  } catch {
    return false;
  }
}

/**
 * Rename a project
 */
export function renameProject(id: string, newName: string): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const project = loadProject(id);
    if (!project) return false;

    project.name = newName;
    project.updatedAt = new Date().toISOString();
    localStorage.setItem(getStorageKey(id), JSON.stringify(project));

    const index = listProjects();
    const meta = index.find(p => p.id === id);
    if (meta) {
      meta.name = newName;
      meta.updatedAt = project.updatedAt;
      localStorage.setItem(PROJECTS_INDEX_KEY, JSON.stringify(index));
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Auto-save project state (one per tool, overwrites previous)
 */
export function autoSave<T>(toolId: string, data: T): void {
  if (typeof window === 'undefined') return;

  try {
    const autoSaveData = {
      toolId,
      data,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(getAutoSaveKey(toolId), JSON.stringify(autoSaveData));
  } catch {
    // Ignore storage errors (quota exceeded, etc.)
  }
}

/**
 * Load auto-saved state for a tool
 */
export function loadAutoSave<T>(toolId: string): { data: T; savedAt: string } | null {
  if (typeof window === 'undefined') return null;

  try {
    const json = localStorage.getItem(getAutoSaveKey(toolId));
    if (!json) return null;
    
    const parsed = JSON.parse(json);
    if (parsed.toolId !== toolId) return null;
    
    return { data: parsed.data as T, savedAt: parsed.savedAt };
  } catch {
    return null;
  }
}

/**
 * Clear auto-save for a tool
 */
export function clearAutoSave(toolId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(getAutoSaveKey(toolId));
  } catch {
    // Ignore
  }
}

/**
 * Export project as JSON file for download
 */
export function exportProjectAsFile<T>(project: SavedProject<T>): void {
  if (typeof window === 'undefined') return;

  const json = JSON.stringify(project, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.lfproject.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import project from JSON file
 */
export async function importProjectFromFile(file: File): Promise<SavedProject | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const project = JSON.parse(json) as SavedProject;
        
        // Validate structure
        if (!project.id || !project.toolId || !project.data) {
          resolve(null);
          return;
        }

        // Generate new ID to avoid conflicts
        const newId = generateId();
        project.id = newId;
        project.createdAt = new Date().toISOString();
        project.updatedAt = project.createdAt;

        // Save imported project
        localStorage.setItem(getStorageKey(newId), JSON.stringify(project));

        // Update index
        const index = listProjects();
        index.unshift({
          id: project.id,
          toolId: project.toolId,
          name: project.name,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        });
        localStorage.setItem(PROJECTS_INDEX_KEY, JSON.stringify(index));

        resolve(project);
      } catch {
        resolve(null);
      }
    };
    reader.onerror = () => resolve(null);
    reader.readAsText(file);
  });
}

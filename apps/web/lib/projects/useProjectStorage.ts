'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  autoSave,
  clearAutoSave,
  deleteProject,
  exportProjectAsFile,
  importProjectFromFile,
  listProjects,
  loadAutoSave,
  loadProject,
  type ProjectMetadata,
  renameProject,
  type SavedProject,
  saveProject,
} from './projectStorage';

const AUTO_SAVE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export interface UseProjectStorageOptions<T> {
  toolId: string;
  getCurrentState: () => T;
  applyState: (state: T) => void;
  onAutoSaveRestored?: (savedAt: string) => void;
}

export interface UseProjectStorageReturn<T> {
  currentProjectId: string | null;
  currentProjectName: string | null;
  projects: ProjectMetadata[];
  isDirty: boolean;
  lastAutoSave: string | null;
  
  saveCurrentProject: (name?: string) => SavedProject<T> | null;
  saveAsNewProject: (name: string) => SavedProject<T> | null;
  loadProjectById: (id: string) => boolean;
  deleteProjectById: (id: string) => boolean;
  renameCurrentProject: (newName: string) => boolean;
  newProject: () => void;
  exportCurrentProject: () => void;
  importProject: (file: File) => Promise<boolean>;
  refreshProjectList: () => void;
  checkAutoSave: () => { data: T; savedAt: string } | null;
  restoreAutoSave: () => boolean;
  dismissAutoSave: () => void;
}

export function useProjectStorage<T>(
  options: UseProjectStorageOptions<T>
): UseProjectStorageReturn<T> {
  const { toolId, getCurrentState, applyState, onAutoSaveRestored } = options;

  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentProjectName, setCurrentProjectName] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<string | null>(null);

  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const getCurrentStateRef = useRef(getCurrentState);
  getCurrentStateRef.current = getCurrentState;

  // Refresh project list
  const refreshProjectList = useCallback(() => {
    setProjects(listProjects(toolId));
  }, [toolId]);

  // Initial load
  useEffect(() => {
    refreshProjectList();
  }, [refreshProjectList]);

  // Auto-save interval
  useEffect(() => {
    autoSaveIntervalRef.current = setInterval(() => {
      try {
        const state = getCurrentStateRef.current();
        autoSave(toolId, state);
        setLastAutoSave(new Date().toISOString());
      } catch {
        // Ignore auto-save errors
      }
    }, AUTO_SAVE_INTERVAL_MS);

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, [toolId]);

  // Save current project (update if exists, create if not)
  const saveCurrentProject = useCallback((name?: string): SavedProject<T> | null => {
    try {
      const state = getCurrentState();
      const projectName = name || currentProjectName || `${toolId} Project`;
      const saved = saveProject(toolId, projectName, state, currentProjectId || undefined);
      
      setCurrentProjectId(saved.id);
      setCurrentProjectName(saved.name);
      setIsDirty(false);
      refreshProjectList();
      
      return saved;
    } catch {
      return null;
    }
  }, [currentProjectId, currentProjectName, getCurrentState, refreshProjectList, toolId]);

  // Save as new project
  const saveAsNewProject = useCallback((name: string): SavedProject<T> | null => {
    try {
      const state = getCurrentState();
      const saved = saveProject(toolId, name, state);
      
      setCurrentProjectId(saved.id);
      setCurrentProjectName(saved.name);
      setIsDirty(false);
      refreshProjectList();
      
      return saved;
    } catch {
      return null;
    }
  }, [getCurrentState, refreshProjectList, toolId]);

  // Load project by ID
  const loadProjectById = useCallback((id: string): boolean => {
    try {
      const project = loadProject<T>(id);
      if (!project || project.toolId !== toolId) return false;

      applyState(project.data);
      setCurrentProjectId(project.id);
      setCurrentProjectName(project.name);
      setIsDirty(false);
      
      return true;
    } catch {
      return false;
    }
  }, [applyState, toolId]);

  // Delete project by ID
  const deleteProjectById = useCallback((id: string): boolean => {
    const success = deleteProject(id);
    if (success) {
      if (currentProjectId === id) {
        setCurrentProjectId(null);
        setCurrentProjectName(null);
      }
      refreshProjectList();
    }
    return success;
  }, [currentProjectId, refreshProjectList]);

  // Rename current project
  const renameCurrentProject = useCallback((newName: string): boolean => {
    if (!currentProjectId) return false;
    
    const success = renameProject(currentProjectId, newName);
    if (success) {
      setCurrentProjectName(newName);
      refreshProjectList();
    }
    return success;
  }, [currentProjectId, refreshProjectList]);

  // New project (clear current)
  const newProject = useCallback(() => {
    setCurrentProjectId(null);
    setCurrentProjectName(null);
    setIsDirty(false);
  }, []);

  // Export current project
  const exportCurrentProject = useCallback(() => {
    if (!currentProjectId) {
      // Save first, then export
      const saved = saveCurrentProject();
      if (saved) {
        exportProjectAsFile(saved);
      }
    } else {
      const project = loadProject<T>(currentProjectId);
      if (project) {
        exportProjectAsFile(project);
      }
    }
  }, [currentProjectId, saveCurrentProject]);

  // Import project from file
  const importProject = useCallback(async (file: File): Promise<boolean> => {
    const project = await importProjectFromFile(file);
    if (!project) return false;

    // Check if it's for this tool
    if (project.toolId !== toolId) {
      deleteProject(project.id);
      return false;
    }

    refreshProjectList();
    return loadProjectById(project.id);
  }, [loadProjectById, refreshProjectList, toolId]);

  // Check for auto-save
  const checkAutoSave = useCallback((): { data: T; savedAt: string } | null => {
    return loadAutoSave<T>(toolId);
  }, [toolId]);

  // Restore auto-save
  const restoreAutoSave = useCallback((): boolean => {
    const saved = loadAutoSave<T>(toolId);
    if (!saved) return false;

    try {
      applyState(saved.data);
      setIsDirty(true);
      clearAutoSave(toolId);
      onAutoSaveRestored?.(saved.savedAt);
      return true;
    } catch {
      return false;
    }
  }, [applyState, onAutoSaveRestored, toolId]);

  // Dismiss auto-save
  const dismissAutoSave = useCallback(() => {
    clearAutoSave(toolId);
  }, [toolId]);

  // Mark as dirty when state changes (caller should call this)
  // This is handled externally by the component

  return {
    currentProjectId,
    currentProjectName,
    projects,
    isDirty,
    lastAutoSave,
    saveCurrentProject,
    saveAsNewProject,
    loadProjectById,
    deleteProjectById,
    renameCurrentProject,
    newProject,
    exportCurrentProject,
    importProject,
    refreshProjectList,
    checkAutoSave,
    restoreAutoSave,
    dismissAutoSave,
  };
}

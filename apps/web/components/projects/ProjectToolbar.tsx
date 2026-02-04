'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Save, FolderOpen, FilePlus, Download, Upload, Trash2, Edit2, X, Check } from 'lucide-react';
import type { ProjectMetadata, UseProjectStorageReturn } from '@/lib/projects';

interface ProjectToolbarProps<T> {
  projectStorage: UseProjectStorageReturn<T>;
  toolDisplayName: string;
}

export function ProjectToolbar<T>({ projectStorage, toolDisplayName }: ProjectToolbarProps<T>) {
  const {
    currentProjectId,
    currentProjectName,
    projects,
    saveCurrentProject,
    saveAsNewProject,
    loadProjectById,
    deleteProjectById,
    renameCurrentProject,
    newProject,
    exportCurrentProject,
    importProject,
    checkAutoSave,
    restoreAutoSave,
    dismissAutoSave,
  } = projectStorage;

  const [showProjectList, setShowProjectList] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showAutoSavePrompt, setShowAutoSavePrompt] = useState(false);
  const [autoSaveDate, setAutoSaveDate] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check for auto-save on mount
  useEffect(() => {
    const saved = checkAutoSave();
    if (saved) {
      setAutoSaveDate(saved.savedAt);
      setShowAutoSavePrompt(true);
    }
  }, [checkAutoSave]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowProjectList(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSave = useCallback(() => {
    if (currentProjectId) {
      saveCurrentProject();
    } else {
      setNewProjectName(`${toolDisplayName} - ${new Date().toLocaleDateString()}`);
      setShowSaveDialog(true);
    }
  }, [currentProjectId, saveCurrentProject, toolDisplayName]);

  const handleSaveAs = useCallback(() => {
    setNewProjectName(currentProjectName || `${toolDisplayName} - ${new Date().toLocaleDateString()}`);
    setShowSaveDialog(true);
  }, [currentProjectName, toolDisplayName]);

  const handleSaveDialogConfirm = useCallback(() => {
    if (newProjectName.trim()) {
      if (currentProjectId) {
        saveAsNewProject(newProjectName.trim());
      } else {
        saveCurrentProject(newProjectName.trim());
      }
      setShowSaveDialog(false);
      setNewProjectName('');
    }
  }, [currentProjectId, newProjectName, saveAsNewProject, saveCurrentProject]);

  const handleLoadProject = useCallback((id: string) => {
    loadProjectById(id);
    setShowProjectList(false);
  }, [loadProjectById]);

  const handleDeleteProject = useCallback((id: string) => {
    if (deleteConfirmId === id) {
      deleteProjectById(id);
      setDeleteConfirmId(null);
    } else {
      setDeleteConfirmId(id);
      setTimeout(() => setDeleteConfirmId(null), 3000);
    }
  }, [deleteConfirmId, deleteProjectById]);

  const handleRenameStart = useCallback((project: ProjectMetadata) => {
    setEditingProjectId(project.id);
    setEditingName(project.name);
  }, []);

  const handleRenameConfirm = useCallback(() => {
    if (editingProjectId && editingName.trim()) {
      if (editingProjectId === currentProjectId) {
        renameCurrentProject(editingName.trim());
      } else {
        // For non-current projects, we need to load, rename, and potentially reload
        const wasCurrentId = currentProjectId;
        loadProjectById(editingProjectId);
        renameCurrentProject(editingName.trim());
        if (wasCurrentId && wasCurrentId !== editingProjectId) {
          loadProjectById(wasCurrentId);
        }
      }
    }
    setEditingProjectId(null);
    setEditingName('');
  }, [currentProjectId, editingName, editingProjectId, loadProjectById, renameCurrentProject]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await importProject(file);
      e.target.value = '';
    }
  }, [importProject]);

  const handleRestoreAutoSave = useCallback(() => {
    restoreAutoSave();
    setShowAutoSavePrompt(false);
  }, [restoreAutoSave]);

  const handleDismissAutoSave = useCallback(() => {
    dismissAutoSave();
    setShowAutoSavePrompt(false);
  }, [dismissAutoSave]);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800/50 border-b border-zinc-700/50">
        <div className="flex items-center gap-1">
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-700/50 rounded transition-colors"
            title="Save project (Ctrl+S)"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowProjectList(!showProjectList)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-700/50 rounded transition-colors"
              title="Open project"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Open</span>
            </button>

            {showProjectList && (
              <div className="absolute top-full left-0 mt-1 w-72 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 max-h-80 overflow-auto">
                <div className="p-2 border-b border-zinc-700">
                  <button
                    onClick={() => { newProject(); setShowProjectList(false); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-700/50 rounded transition-colors"
                  >
                    <FilePlus className="w-4 h-4" />
                    <span>New Project</span>
                  </button>
                </div>

                {projects.length === 0 ? (
                  <div className="p-4 text-center text-sm text-zinc-500">
                    No saved projects
                  </div>
                ) : (
                  <div className="p-2">
                    {projects.map((project) => (
                      <div
                        key={project.id}
                        className={`group flex items-center gap-2 px-3 py-2 rounded transition-colors ${
                          project.id === currentProjectId
                            ? 'bg-blue-600/20 text-blue-400'
                            : 'text-zinc-300 hover:bg-zinc-700/50'
                        }`}
                      >
                        {editingProjectId === project.id ? (
                          <div className="flex-1 flex items-center gap-1">
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameConfirm();
                                if (e.key === 'Escape') setEditingProjectId(null);
                              }}
                              className="flex-1 px-2 py-1 text-sm bg-zinc-900 border border-zinc-600 rounded"
                              autoFocus
                            />
                            <button
                              onClick={handleRenameConfirm}
                              className="p-1 text-green-400 hover:text-green-300"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingProjectId(null)}
                              className="p-1 text-zinc-400 hover:text-zinc-300"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => handleLoadProject(project.id)}
                              className="flex-1 text-left"
                            >
                              <div className="text-sm font-medium truncate">{project.name}</div>
                              <div className="text-xs text-zinc-500">
                                {formatDate(project.updatedAt)}
                              </div>
                            </button>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleRenameStart(project)}
                                className="p-1 text-zinc-400 hover:text-zinc-300"
                                title="Rename"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteProject(project.id)}
                                className={`p-1 ${
                                  deleteConfirmId === project.id
                                    ? 'text-red-400'
                                    : 'text-zinc-400 hover:text-red-400'
                                }`}
                                title={deleteConfirmId === project.id ? 'Click again to confirm' : 'Delete'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-2 border-t border-zinc-700">
                  <button
                    onClick={handleImportClick}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-700/50 rounded transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Import from file...</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleSaveAs}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-700/50 rounded transition-colors"
            title="Save as new project"
          >
            <FilePlus className="w-3.5 h-3.5" />
            <span>Save As</span>
          </button>

          <button
            onClick={exportCurrentProject}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-700/50 rounded transition-colors"
            title="Export project file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>

        {currentProjectName && (
          <div className="ml-auto text-xs text-zinc-500">
            <span className="text-zinc-400">{currentProjectName}</span>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.lfproject.json"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl p-6 w-96">
            <h3 className="text-lg font-semibold text-white mb-4">Save Project</h3>
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveDialogConfirm();
                if (e.key === 'Escape') setShowSaveDialog(false);
              }}
              placeholder="Project name"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDialogConfirm}
                disabled={!newProjectName.trim()}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-save Restore Prompt */}
      {showAutoSavePrompt && (
        <div className="fixed bottom-4 right-4 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl p-4 w-80 z-50">
          <h4 className="text-sm font-semibold text-white mb-2">Restore Previous Work?</h4>
          <p className="text-xs text-zinc-400 mb-3">
            Found auto-saved work from {autoSaveDate ? formatDate(autoSaveDate) : 'earlier'}.
            Would you like to restore it?
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={handleDismissAutoSave}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              Dismiss
            </button>
            <button
              onClick={handleRestoreAutoSave}
              className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
            >
              Restore
            </button>
          </div>
        </div>
      )}
    </>
  );
}

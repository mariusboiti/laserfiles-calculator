'use client';

import React, { useEffect } from 'react';

export interface CanvasKeyboardShortcutsProps {
  enabled: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  onEscape: () => void;
}

export function CanvasKeyboardShortcuts({
  enabled,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onDelete,
  onEscape,
}: CanvasKeyboardShortcutsProps) {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes('mac');
      const mod = isMac ? e.metaKey : e.ctrlKey;

      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (canUndo) {
          e.preventDefault();
          onUndo();
        }
        return;
      }

      if ((mod && e.key.toLowerCase() === 'z' && e.shiftKey) || (!isMac && e.ctrlKey && e.key.toLowerCase() === 'y')) {
        if (canRedo) {
          e.preventDefault();
          onRedo();
        }
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onDelete();
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        onEscape();
        return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, canUndo, canRedo, onUndo, onRedo, onDelete, onEscape]);

  return null;
}

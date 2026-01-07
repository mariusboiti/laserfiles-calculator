'use client';

import React, { useEffect } from 'react';

function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  // In case the event target is a child inside a contenteditable container
  const editableAncestor = el.closest?.('[contenteditable="true"]');
  return Boolean(editableAncestor);
}

export interface CanvasKeyboardShortcutsProps {
  enabled: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  onEscape: () => void;
  onDuplicate?: () => void;
}

export function CanvasKeyboardShortcuts({
  enabled,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onDelete,
  onEscape,
  onDuplicate,
}: CanvasKeyboardShortcutsProps) {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      // Don't steal keystrokes while typing in inputs/textareas.
      if (isEditableTarget(e.target)) return;

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

      if (mod && e.key.toLowerCase() === 'd') {
        if (onDuplicate) {
          e.preventDefault();
          onDuplicate();
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
  }, [enabled, canUndo, canRedo, onUndo, onRedo, onDelete, onEscape, onDuplicate]);

  return null;
}

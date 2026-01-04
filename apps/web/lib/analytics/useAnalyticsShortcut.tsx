'use client';

import { useEffect, useState } from 'react';
import { AnalyticsViewer } from '@/components/analytics/AnalyticsViewer';

/**
 * Hook to handle keyboard shortcut for analytics viewer
 * Ctrl + Shift + A (or Cmd + Shift + A on Mac)
 */
export function useAnalyticsShortcut() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl+Shift+A or Cmd+Shift+A
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === 'a'
      ) {
        event.preventDefault();
        setIsOpen(true);
      }
    };

    // Only enable in development
    if (process.env.NODE_ENV === 'development') {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, []);

  const close = () => setIsOpen(false);

  return { isOpen, close };
}

/**
 * Analytics Provider component that handles the keyboard shortcut
 * and renders the viewer when needed
 */
export function AnalyticsProvider() {
  const { isOpen, close } = useAnalyticsShortcut();

  // Only render in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return <AnalyticsViewer isOpen={isOpen} onClose={close} />;
}

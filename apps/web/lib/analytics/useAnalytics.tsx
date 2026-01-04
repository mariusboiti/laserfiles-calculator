'use client';

import { useEffect } from 'react';
import { trackEvent, type Event } from '@/lib/analytics/trackEvent';

/**
 * Hook to track when a tool is opened
 */
export function useTrackToolOpen(toolSlug: string) {
  useEffect(() => {
    trackEvent({
      type: 'tool_open',
      toolSlug,
      timestamp: Date.now(),
    });
  }, [toolSlug]);
}

/**
 * Hook to track tool actions
 */
export function useTrackToolAction() {
  const trackAction = (toolSlug: string, action: 'generate' | 'upload' | 'import' | 'start') => {
    trackEvent({
      type: 'tool_action',
      toolSlug,
      action,
      timestamp: Date.now(),
    });
  };

  return { trackAction };
}

/**
 * Hook to track AI generation
 */
export function useTrackAIGeneration() {
  const trackAIGeneration = (toolSlug: string) => {
    trackEvent({
      type: 'ai_generate',
      toolSlug,
      timestamp: Date.now(),
    });
  };

  return { trackAIGeneration };
}

/**
 * Hook to track exports
 */
export function useTrackExport() {
  const trackExport = (toolSlug: string) => {
    trackEvent({
      type: 'tool_export',
      toolSlug,
      timestamp: Date.now(),
    });
  };

  return { trackExport };
}

/**
 * Hook to track AI image saves
 */
export function useTrackAISave() {
  const trackAISave = (toolSlug: string) => {
    trackEvent({
      type: 'ai_save',
      toolSlug,
      timestamp: Date.now(),
    });
  };

  return { trackAISave };
}

/**
 * Convenience hook that provides all tracking functions
 */
export function useAnalytics(toolSlug: string) {
  // Track tool open on mount
  useTrackToolOpen(toolSlug);
  
  const { trackAction } = useTrackToolAction();
  const { trackAIGeneration } = useTrackAIGeneration();
  const { trackExport } = useTrackExport();
  const { trackAISave } = useTrackAISave();

  return {
    trackAction: (action: 'generate' | 'upload' | 'import' | 'start') => 
      trackAction(toolSlug, action),
    trackAIGeneration: () => trackAIGeneration(toolSlug),
    trackExport: () => trackExport(toolSlug),
    trackAISave: () => trackAISave(toolSlug),
  };
}

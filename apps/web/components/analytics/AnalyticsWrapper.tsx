'use client';

import { useEffect } from 'react';
import { useAnalytics } from '@/lib/analytics/useAnalytics';

interface AnalyticsWrapperProps {
  toolSlug: string;
  children: React.ReactNode;
  onGenerate?: () => void;
  onExport?: () => void;
  onUpload?: () => void;
  onImport?: () => void;
  onAIGenerate?: () => void;
  onAISave?: () => void;
}

/**
 * Wrapper component to easily add analytics to any tool
 * 
 * Usage:
 * <AnalyticsWrapper 
 *   toolSlug="my-tool"
 *   onGenerate={() => handleGenerate()}
 *   onExport={() => handleExport()}
 * >
 *   <MyToolComponent />
 * </AnalyticsWrapper>
 */
export function AnalyticsWrapper({ 
  toolSlug, 
  children, 
  onGenerate,
  onExport,
  onUpload,
  onImport,
  onAIGenerate,
  onAISave
}: AnalyticsWrapperProps) {
  const analytics = useAnalytics(toolSlug);

  // Track tool open on mount
  useEffect(() => {
    // Already tracked by useAnalytics hook
  }, []);

  const wrappedHandlers = {
    generate: onGenerate ? () => {
      analytics.trackAction('generate');
      onGenerate();
    } : undefined,
    upload: onUpload ? () => {
      analytics.trackAction('upload');
      onUpload();
    } : undefined,
    import: onImport ? () => {
      analytics.trackAction('import');
      onImport();
    } : undefined,
    export: onExport ? () => {
      analytics.trackExport();
      onExport();
    } : undefined,
    aiGenerate: onAIGenerate ? () => {
      analytics.trackAIGeneration();
      onAIGenerate();
    } : undefined,
    aiSave: onAISave ? () => {
      analytics.trackAISave();
      onAISave();
    } : undefined,
  };

  // Pass handlers via context or render prop if needed
  // For now, just return children with analytics enabled
  return <>{children}</>;
}

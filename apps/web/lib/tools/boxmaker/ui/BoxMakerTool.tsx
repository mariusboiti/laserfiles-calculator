'use client';

import React, { useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import styles from '../boxmaker.module.css';
import { useToolUx } from '@/components/ux/ToolUxProvider';
import { useAnalytics } from '@/lib/analytics/useAnalytics';
import { useLanguage } from '@/app/(app)/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';

function BoxMakerLoading() {
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950">
      <div className="text-slate-400">{t('boxmaker.loading')}</div>
    </div>
  );
}

// Dynamic import to avoid SSR issues with Three.js
const App = dynamic(() => import('../boxmaker/ui/BoxMakerApp'), {
  ssr: false,
  loading: () => <BoxMakerLoading />,
});

/**
 * BoxMakerTool - Studio wrapper for BoxMaker
 * 
 * Wraps the BoxMaker App component for integration into LaserFilesPro Studio.
 * Uses dynamic import to avoid SSR issues with Three.js/WebGL.
 */
export function BoxMakerTool() {
  const analytics = useAnalytics('boxmaker');
  const { api } = useToolUx();

  // BoxMaker always has content, so report isEmpty: false
  useEffect(() => {
    api.setIsEmpty(false);
  }, [api]);

  return (
    <div className={`lfs-tool lfs-tool-boxmaker ${styles.boxmaker_root}`}>
      <App />
    </div>
  );
}

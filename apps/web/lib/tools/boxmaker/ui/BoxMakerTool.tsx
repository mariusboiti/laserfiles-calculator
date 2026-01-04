'use client';

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import styles from '../boxmaker.module.css';
import { useToolUx } from '@/components/ux/ToolUxProvider';
import { useAnalytics } from '@/lib/analytics/useAnalytics';

// Dynamic import to avoid SSR issues with Three.js
const App = dynamic(() => import('../boxmaker/ui/BoxMakerApp'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen bg-slate-950">
      <div className="text-slate-400">Loading BoxMaker...</div>
    </div>
  ),
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

'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import styles from '../boxmaker.module.css';

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
  return (
    <div className={`lfs-tool lfs-tool-boxmaker ${styles.boxmaker_root}`}>
      <App />
    </div>
  );
}

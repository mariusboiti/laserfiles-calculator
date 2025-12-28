'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const App = dynamic(() => import('../src/App'), {
  ssr: false,
});

interface PanelSplitterToolProps {
  onResetCallback?: (callback: () => void) => void;
}

export function PanelSplitterTool({ onResetCallback }: PanelSplitterToolProps) {
  return (
    <div className="lfs-tool lfs-tool-panel-splitter">
      <App onResetCallback={onResetCallback} />
    </div>
  );
}

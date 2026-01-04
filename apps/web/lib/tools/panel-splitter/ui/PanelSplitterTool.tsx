'use client';

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useToolUx } from '@/components/ux/ToolUxProvider';

const App = dynamic(() => import('../src/App'), {
  ssr: false,
});

interface PanelSplitterToolProps {
  onResetCallback?: (callback: () => void) => void;
}

export function PanelSplitterTool({ onResetCallback }: PanelSplitterToolProps) {
  const { api } = useToolUx();

  // Panel Splitter shows upload UI initially, report isEmpty: false once loaded
  useEffect(() => {
    api.setIsEmpty(false);
  }, [api]);

  return (
    <div className="lfs-tool lfs-tool-panel-splitter">
      <App onResetCallback={onResetCallback} />
    </div>
  );
}

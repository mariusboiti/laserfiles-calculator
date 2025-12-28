'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const App = dynamic(() => import('../src/App'), {
  ssr: false,
});

interface BulkNameTagsToolProps {
  onResetCallback?: (callback: () => void) => void;
}

export function BulkNameTagsTool({ onResetCallback }: BulkNameTagsToolProps) {
  return (
    <div className="lfs-tool lfs-tool-bulk-name-tags">
      <App onResetCallback={onResetCallback} />
    </div>
  );
}

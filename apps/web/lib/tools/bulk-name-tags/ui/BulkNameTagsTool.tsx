'use client';

import React, { useEffect } from 'react';
import { useToolUx } from '@/components/ux/ToolUxProvider';
import dynamic from 'next/dynamic';
import { useAnalytics } from '@/lib/analytics/useAnalytics';

const App = dynamic(() => import('../src/App'), {
  ssr: false,
});

interface BulkNameTagsToolProps {
  onResetCallback?: (callback: () => void) => void;
}

export function BulkNameTagsTool({ onResetCallback }: BulkNameTagsToolProps) {
  const analytics = useAnalytics('bulk-name-tags');
  const { api } = useToolUx();

  useEffect(() => {
    api.setIsEmpty(false);
  }, [api]);

  return (
    <div className="lfs-tool lfs-tool-bulk-name-tags">
      <App onResetCallback={onResetCallback} />
    </div>
  );
}

'use client';

import { useRef } from 'react';
import { ToolShell } from '../../../../components/studio/ToolShell';
import { getToolBySlug } from '../../../../lib/studio/tools/registry';
import { BoxMakerHelp } from '../../../../lib/tools/boxmaker/boxmaker/ui/BoxMakerHelp';

export default function BoxMakerPage() {
  const tool = getToolBySlug('boxmaker');
  const resetCallbackRef = useRef<(() => void) | null>(null);
  const exportCallbackRef = useRef<(() => void) | null>(null);
  
  if (!tool) return null;

  const Tool = tool.Component;

  const handleReset = () => {
    if (resetCallbackRef.current) {
      resetCallbackRef.current();
    }
  };

  const handleExport = () => {
    if (exportCallbackRef.current) {
      exportCallbackRef.current();
    }
  };

  return (
    <ToolShell
      slug={tool.slug}
      titleKey={tool.titleKey}
      descriptionKey={tool.descriptionKey}
      proFeatures={tool.proFeatures}
      toolSlug="boxmaker"
      onReset={handleReset}
      onExport={handleExport}
      help={<BoxMakerHelp />}
    >
      <Tool 
        onResetCallback={(callback: () => void) => { resetCallbackRef.current = callback; }}
        onExportCallback={(callback: () => void) => { exportCallbackRef.current = callback; }}
      />
    </ToolShell>
  );
}

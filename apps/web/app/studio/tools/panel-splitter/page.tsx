'use client';

import { useRef } from 'react';
import { ToolShell } from '../../../../components/studio/ToolShell';
import { getToolBySlug } from '../../../../lib/studio/tools/registry';
import { PanelSplitterHelp } from '../../../../lib/tools/panel-splitter/ui/PanelSplitterHelp';

export default function PanelSplitterPage() {
  const tool = getToolBySlug('panel-splitter');
  const resetCallbackRef = useRef<(() => void) | null>(null);
  
  if (!tool) return null;

  const Tool = tool.Component;

  const handleReset = () => {
    if (resetCallbackRef.current) {
      resetCallbackRef.current();
    }
  };

  return (
    <ToolShell
      slug={tool.slug}
      title={tool.title}
      description={tool.description}
      proFeatures={tool.proFeatures}
      toolSlug="panel-splitter"
      onReset={handleReset}
      help={<PanelSplitterHelp />}
    >
      <Tool onResetCallback={(callback: () => void) => { resetCallbackRef.current = callback; }} />
    </ToolShell>
  );
}

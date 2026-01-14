'use client';

import { useRef } from 'react';
import { ToolShell } from '../../../../components/studio/ToolShell';
import { getToolBySlug } from '../../../../lib/studio/tools/registry';
import { CurvedPhotoFrameGeneratorHelp } from '../../../../lib/tools/curved-photo-frame-generator/ui/CurvedPhotoFrameGeneratorHelp';

export default function CurvedPhotoFrameGeneratorPage() {
  const tool = getToolBySlug('curved-photo-frame-generator');
  const resetCallbackRef = useRef<(() => void) | null>(null);
  const exportCallbackRef = useRef<(() => void) | null>(null);

  if (!tool) return null;

  const Tool = tool.Component as any;

  const handleReset = () => {
    resetCallbackRef.current?.();
  };

  const handleExport = () => {
    exportCallbackRef.current?.();
  };

  return (
    <ToolShell
      slug={tool.slug}
      titleKey={tool.titleKey}
      descriptionKey={tool.descriptionKey}
      proFeatures={tool.proFeatures}
      toolSlug="curved-photo-frame-generator"
      onReset={handleReset}
      onExport={handleExport}
      help={<CurvedPhotoFrameGeneratorHelp />}
    >
      <Tool
        onResetCallback={(callback: () => void) => {
          resetCallbackRef.current = callback;
        }}
        onExportCallback={(callback: () => void) => {
          exportCallbackRef.current = callback;
        }}
      />
    </ToolShell>
  );
}

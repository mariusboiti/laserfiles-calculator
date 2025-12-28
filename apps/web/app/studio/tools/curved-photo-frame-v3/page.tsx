'use client';

import { useRef } from 'react';
import { ToolShell } from '../../../../components/studio/ToolShell';
import { usePlan } from '../../../../lib/studio/access/usePlan';
import { getToolBySlug } from '../../../../lib/studio/tools/registry';
import { CurvedPhotoFrameV3Help } from '../../../../lib/tools/curved-photo-frame-generator-v3/ui/CurvedPhotoFrameV3Help';

export default function CurvedPhotoFrameV3Page() {
  const { plan } = usePlan();
  const tool = getToolBySlug('curved-photo-frame-v3');
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
      title={tool.title}
      description={tool.description}
      proFeatures={tool.proFeatures}
      toolSlug="curved-photo-frame-v3"
      onReset={handleReset}
      onExport={handleExport}
      help={<CurvedPhotoFrameV3Help />}
    >
      <Tool
        featureFlags={{ isProUser: plan === 'pro' }}
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

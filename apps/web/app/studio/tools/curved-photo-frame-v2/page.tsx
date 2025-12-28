'use client';

import { useRef } from 'react';
import { ToolShell } from '../../../../components/studio/ToolShell';
import { usePlan } from '../../../../lib/studio/access/usePlan';
import { getToolBySlug } from '../../../../lib/studio/tools/registry';
import { CurvedPhotoFrameV2Help } from '../../../../lib/tools/curved-photo-frame-generator-v2/ui/CurvedPhotoFrameV2Help';

export default function CurvedPhotoFrameV2Page() {
  const { plan } = usePlan();
  const tool = getToolBySlug('curved-photo-frame-v2');
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
      toolSlug="curved-photo-frame-v2"
      onReset={handleReset}
      onExport={handleExport}
      help={<CurvedPhotoFrameV2Help />}
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

'use client';

import { ToolShell } from '../../../../components/studio/ToolShell';
import { getToolBySlug } from '../../../../lib/studio/tools/registry';

export default function InlayOffsetCalculatorPage() {
  const tool = getToolBySlug('inlay-offset-calculator');
  if (!tool) return null;

  const Tool = tool.Component;

  return (
    <ToolShell
      slug={tool.slug}
      title={tool.title}
      description={tool.description}
      proFeatures={tool.proFeatures}
    >
      <Tool />
    </ToolShell>
  );
}

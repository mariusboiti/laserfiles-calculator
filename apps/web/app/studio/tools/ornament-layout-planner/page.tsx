'use client';

import { useState } from 'react';
import { ToolShell } from '../../../../components/studio/ToolShell';
import { getToolBySlug } from '../../../../lib/studio/tools/registry';

export default function OrnamentLayoutPlannerPage() {
  const tool = getToolBySlug('ornament-layout-planner');
  if (!tool) return null;

  const Tool = tool.Component;

  const [getExportPayload, setGetExportPayload] = useState<
    null | (() => Promise<{ svg: string; name?: string; meta?: any }> | { svg: string; name?: string; meta?: any })
  >(null);

  return (
    <ToolShell
      slug={tool.slug}
      title={tool.title}
      description={tool.description}
      proFeatures={tool.proFeatures}
      toolSlug="ornament-layout-planner"
      getExportPayload={getExportPayload ?? undefined}
    >
      <Tool onGetExportPayload={setGetExportPayload} />
    </ToolShell>
  );
}

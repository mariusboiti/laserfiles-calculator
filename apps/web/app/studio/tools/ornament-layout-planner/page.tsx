'use client';

import { useState } from 'react';
import { ToolShell } from '../../../../components/studio/ToolShell';
import { getToolBySlug } from '../../../../lib/studio/tools/registry';

export default function OrnamentLayoutPlannerPage() {
  const [getExportPayload, setGetExportPayload] = useState<
    null | (() => Promise<{ svg: string; name?: string; meta?: any }> | { svg: string; name?: string; meta?: any })
  >(null);

  const tool = getToolBySlug('ornament-layout-planner');
  if (!tool) return null;

  const Tool = tool.Component;

  return (
    <ToolShell
      slug={tool.slug}
      titleKey={tool.titleKey}
      descriptionKey={tool.descriptionKey}
      proFeatures={tool.proFeatures}
      toolSlug="ornament-layout-planner"
      getExportPayload={getExportPayload ?? undefined}
    >
      <Tool onGetExportPayload={setGetExportPayload} />
    </ToolShell>
  );
}

'use client';

import { useState } from 'react';
import { ToolShell } from '../../../../components/studio/ToolShell';
import { getToolBySlug } from '../../../../lib/studio/tools/registry';

export default function RoundCoasterGeneratorPage() {
  const tool = getToolBySlug('round-coaster-generator');
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
      toolSlug="round-coaster-generator"
      getExportPayload={getExportPayload ?? undefined}
    >
      <Tool onGetExportPayload={setGetExportPayload} />
    </ToolShell>
  );
}

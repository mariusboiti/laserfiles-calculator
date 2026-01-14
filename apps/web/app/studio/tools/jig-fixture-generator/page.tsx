'use client';

import { useState } from 'react';
import { ToolShell } from '../../../../components/studio/ToolShell';
import { getToolBySlug } from '../../../../lib/studio/tools/registry';

export default function JigFixtureGeneratorPage() {
  const tool = getToolBySlug('jig-fixture-generator');
  if (!tool) return null;

  const Tool = tool.Component;

  const [getExportPayload, setGetExportPayload] = useState<
    null | (() => Promise<{ svg: string; name?: string; meta?: any }> | { svg: string; name?: string; meta?: any })
  >(null);

  return (
    <ToolShell
      slug={tool.slug}
      titleKey={tool.titleKey}
      descriptionKey={tool.descriptionKey}
      proFeatures={tool.proFeatures}
      toolSlug="jig-fixture-generator"
      getExportPayload={getExportPayload ?? undefined}
    >
      <Tool onGetExportPayload={setGetExportPayload} />
    </ToolShell>
  );
}

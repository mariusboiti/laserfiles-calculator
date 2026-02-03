'use client';

import { ToolShell } from '@/components/studio/ToolShell';
import { getToolBySlug } from '@/lib/studio/tools/registry';
import { NestingToolPage } from '@/lib/tools/nesting/NestingToolPage';

export default function NestingToolStudioPage() {
  const tool = getToolBySlug('nesting');

  if (!tool) return null;

  return (
    <ToolShell
      slug={tool.slug}
      titleKey={tool.titleKey}
      descriptionKey={tool.descriptionKey}
      proFeatures={tool.proFeatures}
      toolSlug="nesting"
    >
      <NestingToolPage />
    </ToolShell>
  );
}

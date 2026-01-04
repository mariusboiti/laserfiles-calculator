import { getToolBySlug } from '@/lib/studio/tools/registry';
import { ToolShell } from '@/components/studio/ToolShell';

export default function Page() {
  const tool = getToolBySlug('bulk-name-tags');
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

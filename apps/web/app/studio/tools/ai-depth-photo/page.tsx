import { ToolShell } from '@/components/studio/ToolShell';
import { AIDepthEngravingTool } from '@/lib/tools/ai-depth-photo/ui/AIDepthEngravingTool';
import { getStudioToolMetaBySlug } from '@/lib/studio/tools/meta';

export default function AIDepthPhotoPage() {
  const meta = getStudioToolMetaBySlug('ai-depth-photo');

  if (!meta) return null;

  return (
    <ToolShell slug={meta.slug} titleKey={meta.titleKey} descriptionKey={meta.descriptionKey}>
      <AIDepthEngravingTool />
    </ToolShell>
  );
}

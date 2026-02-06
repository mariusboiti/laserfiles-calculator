import { ToolShell } from '@/components/studio/ToolShell';
import { PhotoProductAITool } from '@/lib/tools/photo-product-ai/ui/PhotoProductAITool';
import { getStudioToolMetaBySlug } from '@/lib/studio/tools/meta';

export const metadata = {
  title: 'Photo Product AI',
};

export default function PhotoProductAIPage() {
  const meta = getStudioToolMetaBySlug('photo-product-ai');

  if (!meta) return null;

  return (
    <ToolShell slug={meta.slug} titleKey={meta.titleKey} descriptionKey={meta.descriptionKey}>
      <PhotoProductAITool />
    </ToolShell>
  );
}

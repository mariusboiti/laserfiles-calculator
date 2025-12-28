import { ToolShell } from '@/components/studio/ToolShell';
import { AIDepthEngravingTool } from '@/lib/tools/ai-depth-photo/ui/AIDepthEngravingTool';

export default function AIDepthPhotoPage() {
  return (
    <ToolShell toolSlug="ai-depth-photo">
      <AIDepthEngravingTool />
    </ToolShell>
  );
}

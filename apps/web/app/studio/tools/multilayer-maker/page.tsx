'use client';

import { ToolShell } from '../../../../components/studio/ToolShell';
import { MultiLayerWizard } from '../../../../components/multilayer/MultiLayerWizard';

export default function MultiLayerMakerPage() {
  return (
    <ToolShell
      slug="multilayer-maker"
      title="MultiLayer Maker V3"
      description="Convert images into clean multilayer vector cut files for laser cutting"
      showBack={true}
    >
      <div className="h-[calc(100vh-200px)]">
        <MultiLayerWizard />
      </div>
    </ToolShell>
  );
}

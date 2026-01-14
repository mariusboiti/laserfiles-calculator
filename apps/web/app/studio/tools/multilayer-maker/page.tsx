'use client';

import { ToolShell } from '../../../../components/studio/ToolShell';
import { MultiLayerWizard } from '../../../../components/multilayer/MultiLayerWizard';

export default function MultiLayerMakerPage() {
  return (
    <ToolShell
      slug="multilayer-maker"
      titleKey="tools.multilayer_maker.title"
      descriptionKey="tools.multilayer_maker.subtitle"
      showBack={true}
    >
      <div className="h-[calc(100vh-200px)]">
        <MultiLayerWizard />
      </div>
    </ToolShell>
  );
}

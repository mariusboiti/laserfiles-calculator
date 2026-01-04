'use client';

import { useRef } from 'react';
import { ToolShell } from '../../../../components/studio/ToolShell';
import { getToolBySlug } from '../../../../lib/studio/tools/registry';
import { EngravePrepHelp } from '../../../../lib/tools/engraveprep/ui/EngravePrepHelp';
import type { EngravePrepToolRef } from '../../../../lib/tools/engraveprep/ui/EngravePrepTool';

export default function EngravePrepPage() {
  const tool = getToolBySlug('engraveprep');
  const toolRef = useRef<EngravePrepToolRef>(null);
  
  if (!tool) return null;

  const Tool = tool.Component;

  const handleReset = () => {
    if (toolRef.current) {
      toolRef.current.reset();
    }
  };

  return (
    <ToolShell
      slug={tool.slug}
      title={tool.title}
      description={tool.description}
      proFeatures={tool.proFeatures}
      toolSlug="engraveprep"
      onReset={handleReset}
      help={<EngravePrepHelp />}
    >
      <Tool ref={toolRef} />
    </ToolShell>
  );
}

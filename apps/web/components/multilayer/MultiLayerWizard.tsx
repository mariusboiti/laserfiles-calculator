'use client';

import { useState, useCallback } from 'react';
import type { WizardStep, ProjectState } from '@/lib/multilayer/types';
import { DEFAULT_PROJECT_STATE } from '@/lib/multilayer/types';
import { SourceStep } from './SourceStep';
import { LayersStep } from './LayersStep';
import { ExportStep } from './ExportStep';
import { useProjectStorage } from '@/lib/projects';
import { ProjectToolbar } from '@/components/projects';

const TOOL_ID = 'multilayer-maker';

interface MultiLayerWizardProps {
  onExport?: () => void;
}

export function MultiLayerWizard({ onExport }: MultiLayerWizardProps) {
  const [project, setProject] = useState<ProjectState>(DEFAULT_PROJECT_STATE);

  // Project storage
  const getCurrentState = useCallback(() => project, [project]);
  const applyState = useCallback((state: ProjectState) => {
    setProject(state);
  }, []);

  const projectStorage = useProjectStorage<ProjectState>({
    toolId: TOOL_ID,
    getCurrentState,
    applyState,
  });

  const steps: { id: WizardStep; label: string; disabled: boolean }[] = [
    { id: 'source', label: '1. Source', disabled: false },
    { id: 'layers', label: '2. Layers', disabled: !project.sourceImage },
    { id: 'export', label: '3. Export', disabled: project.vectorLayers.length === 0 },
  ];

  const updateProject = (updates: Partial<ProjectState>) => {
    setProject(prev => ({ ...prev, ...updates }));
  };

  const goToStep = (step: WizardStep) => {
    const stepData = steps.find(s => s.id === step);
    if (stepData && !stepData.disabled) {
      updateProject({ currentStep: step });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Project Toolbar */}
      <ProjectToolbar projectStorage={projectStorage} toolDisplayName="MultiLayer Maker" />
      
      {/* Wizard Navigation */}
      <div className="flex gap-2 p-4 bg-slate-900/60 border-b border-slate-800">
        {steps.map(step => (
          <button
            key={step.id}
            onClick={() => goToStep(step.id)}
            disabled={step.disabled}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${project.currentStep === step.id
                ? 'bg-sky-600 text-white'
                : step.disabled
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }
            `}
          >
            {step.label}
          </button>
        ))}
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-auto">
        {project.currentStep === 'source' && (
          <SourceStep
            project={project}
            onUpdateProject={updateProject}
            onNext={() => goToStep('layers')}
          />
        )}
        {project.currentStep === 'layers' && (
          <LayersStep
            project={project}
            onUpdateProject={updateProject}
            onNext={() => goToStep('export')}
            onBack={() => goToStep('source')}
          />
        )}
        {project.currentStep === 'export' && (
          <ExportStep
            project={project}
            onUpdateProject={updateProject}
            onBack={() => goToStep('layers')}
            onExport={onExport}
          />
        )}
      </div>
    </div>
  );
}

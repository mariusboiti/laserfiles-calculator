'use client';

/**
 * Tour Provider Component
 * Wraps a tool with tour functionality
 */

import { useTour } from '@/lib/tours/useTour';
import { hasTour } from '@/lib/tours/registry';
import { TourOverlay } from './TourOverlay';
import { TourLauncher } from './TourLauncher';
import { TourSuggestion } from './TourSuggestion';

interface TourProviderProps {
  toolSlug: string;
  children: React.ReactNode;
}

export function TourProvider({ toolSlug, children }: TourProviderProps) {
  const tourAvailable = hasTour(toolSlug);

  const {
    isOpen,
    currentStepIndex,
    totalSteps,
    currentStep,
    progress,
    targetElement,
    isLoading,
    showSuggestion,
    startTour,
    nextStep,
    prevStep,
    skipTour,
    finishTour,
    closeTour,
    dismissSuggestion,
  } = useTour({ toolSlug, autoSuggest: tourAvailable });

  return (
    <>
      {children}

      {/* Tour Overlay */}
      {isOpen && currentStep && (
        <TourOverlay
          step={currentStep}
          stepIndex={currentStepIndex}
          totalSteps={totalSteps}
          targetElement={targetElement}
          onNext={nextStep}
          onPrev={prevStep}
          onSkip={skipTour}
          onFinish={finishTour}
          onClose={closeTour}
        />
      )}

      {/* Tour Suggestion */}
      {showSuggestion && !isOpen && (
        <TourSuggestion onStart={startTour} onDismiss={dismissSuggestion} />
      )}
    </>
  );
}

/**
 * Hook to get tour launcher props for ToolShell
 */
export function useTourLauncher(toolSlug: string) {
  const tourAvailable = hasTour(toolSlug);

  const { progress, isLoading, startTour } = useTour({
    toolSlug,
    autoSuggest: false, // Don't auto-suggest from launcher hook
  });

  return {
    status: progress.status,
    isLoading,
    hasTour: tourAvailable,
    onStartTour: startTour,
  };
}

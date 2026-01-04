'use client';

/**
 * useTour Hook
 * Manages tour state, navigation, and persistence
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { TourConfig, TourProgress, TourStatus } from './types';
import { getTourConfig } from './registry';

const STORAGE_KEY_PREFIX = 'tour_progress_';

interface UseTourOptions {
  toolSlug: string;
  autoSuggest?: boolean;
}

interface UseTourReturn {
  // State
  isOpen: boolean;
  currentStepIndex: number;
  totalSteps: number;
  currentStep: TourConfig['steps'][0] | null;
  progress: TourProgress;
  config: TourConfig | null;
  targetElement: HTMLElement | null;
  isLoading: boolean;
  showSuggestion: boolean;

  // Actions
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  finishTour: () => void;
  closeTour: () => void;
  dismissSuggestion: () => void;
}

async function fetchProgress(toolSlug: string): Promise<TourProgress> {
  try {
    const response = await fetch(`/api/tours/progress?toolSlug=${encodeURIComponent(toolSlug)}`);
    const result = await response.json();
    if (result.ok && result.data) {
      return result.data;
    }
  } catch (error) {
    console.warn('Failed to fetch tour progress from server:', error);
  }

  // Fallback to localStorage
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PREFIX + toolSlug);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    // Ignore localStorage errors
  }

  return {
    toolSlug,
    status: 'NOT_STARTED',
    lastStepIndex: 0,
  };
}

async function saveProgress(progress: TourProgress): Promise<void> {
  // Save to localStorage first (immediate)
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + progress.toolSlug, JSON.stringify(progress));
  } catch (e) {
    // Ignore localStorage errors
  }

  // Then try server
  try {
    await fetch('/api/tours/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(progress),
    });
  } catch (error) {
    console.warn('Failed to save tour progress to server:', error);
  }
}

export function useTour(options: UseTourOptions): UseTourReturn {
  const { toolSlug, autoSuggest = true } = options;

  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState<TourProgress>({
    toolSlug,
    status: 'NOT_STARTED',
    lastStepIndex: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);

  const config = getTourConfig(toolSlug);
  const totalSteps = config?.steps.length || 0;
  const currentStep = config?.steps[currentStepIndex] || null;

  const suggestionShownRef = useRef(false);

  // Load progress on mount
  useEffect(() => {
    let mounted = true;

    async function loadProgress() {
      setIsLoading(true);
      const loaded = await fetchProgress(toolSlug);
      if (mounted) {
        setProgress(loaded);
        setCurrentStepIndex(loaded.lastStepIndex);
        setIsLoading(false);

        // Show suggestion for first-time users (unless "Don't show again" was checked)
        const suggestionHidden = (() => {
          try {
            return localStorage.getItem(`tourSuggestionHidden:${toolSlug}`) === 'true';
          } catch {
            return false;
          }
        })();

        if (
          autoSuggest &&
          loaded.status === 'NOT_STARTED' &&
          config &&
          !suggestionShownRef.current &&
          !suggestionHidden
        ) {
          suggestionShownRef.current = true;
          // Delay suggestion (10 seconds as requested)
          setTimeout(() => {
            if (mounted) {
              setShowSuggestion(true);
            }
          }, 10000);
        }
      }
    }

    loadProgress();

    return () => {
      mounted = false;
    };
  }, [toolSlug, autoSuggest, config]);

  // Find and highlight target element when step changes
  useEffect(() => {
    if (!isOpen || !currentStep) {
      setTargetElement(null);
      return;
    }

    const findTarget = () => {
      const target = document.querySelector(`[data-tour="${currentStep.target}"]`) as HTMLElement;
      setTargetElement(target);

      if (target) {
        // Scroll target into view
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center',
        });
      }
    };

    // Small delay to allow DOM to settle
    const timer = setTimeout(findTarget, 100);
    return () => clearTimeout(timer);
  }, [isOpen, currentStep, currentStepIndex]);

  const startTour = useCallback(() => {
    setShowSuggestion(false);
    setCurrentStepIndex(0);
    setIsOpen(true);

    const newProgress: TourProgress = {
      toolSlug,
      status: 'IN_PROGRESS',
      lastStepIndex: 0,
    };
    setProgress(newProgress);
    saveProgress(newProgress);
  }, [toolSlug]);

  const nextStep = useCallback(() => {
    if (currentStepIndex < totalSteps - 1) {
      const newIndex = currentStepIndex + 1;
      setCurrentStepIndex(newIndex);

      const newProgress: TourProgress = {
        toolSlug,
        status: 'IN_PROGRESS',
        lastStepIndex: newIndex,
      };
      setProgress(newProgress);
      saveProgress(newProgress);
    } else {
      // Last step - finish tour
      finishTour();
    }
  }, [currentStepIndex, totalSteps, toolSlug]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      const newIndex = currentStepIndex - 1;
      setCurrentStepIndex(newIndex);

      const newProgress: TourProgress = {
        toolSlug,
        status: 'IN_PROGRESS',
        lastStepIndex: newIndex,
      };
      setProgress(newProgress);
      saveProgress(newProgress);
    }
  }, [currentStepIndex, toolSlug]);

  const skipTour = useCallback(() => {
    setIsOpen(false);
    setTargetElement(null);

    const newProgress: TourProgress = {
      toolSlug,
      status: 'SKIPPED',
      lastStepIndex: currentStepIndex,
    };
    setProgress(newProgress);
    saveProgress(newProgress);
  }, [toolSlug, currentStepIndex]);

  const finishTour = useCallback(() => {
    setIsOpen(false);
    setTargetElement(null);

    const newProgress: TourProgress = {
      toolSlug,
      status: 'COMPLETED',
      lastStepIndex: totalSteps - 1,
    };
    setProgress(newProgress);
    saveProgress(newProgress);
  }, [toolSlug, totalSteps]);

  const closeTour = useCallback(() => {
    setIsOpen(false);
    setTargetElement(null);
  }, []);

  const dismissSuggestion = useCallback(() => {
    setShowSuggestion(false);
  }, []);

  return {
    isOpen,
    currentStepIndex,
    totalSteps,
    currentStep,
    progress,
    config,
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
  };
}

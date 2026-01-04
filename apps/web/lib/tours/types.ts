/**
 * Tour System Types
 */

export type TourStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';

export type TourPlacement = 'top' | 'bottom' | 'left' | 'right' | 'auto';

export interface TourStep {
  id: string;
  target: string; // data-tour attribute value
  titleKey: string;
  bodyKey: string;
  titleFallback: string;
  bodyFallback: string;
  placement?: TourPlacement;
}

export interface TourConfig {
  toolSlug: string;
  steps: TourStep[];
}

export interface TourProgress {
  toolSlug: string;
  status: TourStatus;
  lastStepIndex: number;
}

export interface TourState {
  isOpen: boolean;
  currentStepIndex: number;
  progress: TourProgress;
  config: TourConfig | null;
}

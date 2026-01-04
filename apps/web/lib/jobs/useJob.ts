'use client';

/**
 * useJob Hook
 * React hook for running jobs with progress tracking
 */

import { useState, useCallback, useEffect } from 'react';
import { jobManager, createJobId, type JobProgress, type JobResult } from './jobManager';

export type JobState = 'idle' | 'running' | 'completed' | 'cancelled' | 'error';

export interface UseJobReturn<T> {
  state: JobState;
  progress: JobProgress | null;
  result: T | null;
  error: string | null;
  isRunning: boolean;
  startJob: (
    label: string,
    fn: (signal: AbortSignal, onProgress: (p: JobProgress) => void) => Promise<T>,
    options?: { timeoutMs?: number }
  ) => Promise<JobResult<T>>;
  cancelJob: () => void;
}

export function useJob<T = unknown>(toolSlug: string, action: string): UseJobReturn<T> {
  const [state, setState] = useState<JobState>('idle');
  const [progress, setProgress] = useState<JobProgress | null>(null);
  const [result, setResult] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  const startJob = useCallback(
    async (
      label: string,
      fn: (signal: AbortSignal, onProgress: (p: JobProgress) => void) => Promise<T>,
      options?: { timeoutMs?: number }
    ): Promise<JobResult<T>> => {
      const jobId = createJobId(toolSlug, action);
      setCurrentJobId(jobId);
      setState('running');
      setProgress(null);
      setResult(null);
      setError(null);

      const jobResult = await jobManager.runJob<T>({
        id: jobId,
        label,
        fn,
        timeoutMs: options?.timeoutMs,
        onProgress: setProgress,
      });

      if (jobResult.ok) {
        setState('completed');
        setResult(jobResult.data ?? null);
      } else {
        if (jobResult.error?.includes('cancelled') || jobResult.error?.includes('timed out')) {
          setState('cancelled');
        } else {
          setState('error');
        }
        setError(jobResult.error ?? 'Unknown error');
      }

      setCurrentJobId(null);
      return jobResult;
    },
    [toolSlug, action]
  );

  const cancelJob = useCallback(() => {
    if (currentJobId) {
      jobManager.cancelJob(currentJobId);
      setState('cancelled');
      setCurrentJobId(null);
    }
  }, [currentJobId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentJobId) {
        jobManager.cancelJob(currentJobId);
      }
    };
  }, [currentJobId]);

  return {
    state,
    progress,
    result,
    error,
    isRunning: state === 'running',
    startJob,
    cancelJob,
  };
}

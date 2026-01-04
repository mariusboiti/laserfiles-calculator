'use client';

/**
 * Job Manager
 * Manages long-running tasks with progress, cancellation, and timeout protection
 */

export type JobStatus = 'idle' | 'running' | 'completed' | 'cancelled' | 'error';

export interface JobProgress {
  stage: string;
  progress: number; // 0-1
  message?: string;
}

export interface JobResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface RunJobOptions<T> {
  id: string;
  label: string;
  fn: (signal: AbortSignal, onProgress: (p: JobProgress) => void) => Promise<T>;
  timeoutMs?: number;
  onProgress?: (p: JobProgress) => void;
}

interface ActiveJob {
  id: string;
  label: string;
  controller: AbortController;
  startTime: number;
}

class JobManagerSingleton {
  private activeJobs: Map<string, ActiveJob> = new Map();
  private listeners: Set<(jobs: ActiveJob[]) => void> = new Set();
  private maxConcurrent = 2;

  /**
   * Run a job with timeout and cancellation support
   */
  async runJob<T>(options: RunJobOptions<T>): Promise<JobResult<T>> {
    const { id, label, fn, timeoutMs = 60000, onProgress } = options;

    // Check concurrency limit
    if (this.activeJobs.size >= this.maxConcurrent) {
      return {
        ok: false,
        error: 'Too many jobs running. Please wait for current jobs to complete.',
      };
    }

    // Check if job already running
    if (this.activeJobs.has(id)) {
      return {
        ok: false,
        error: 'This job is already running.',
      };
    }

    const controller = new AbortController();
    const job: ActiveJob = {
      id,
      label,
      controller,
      startTime: Date.now(),
    };

    this.activeJobs.set(id, job);
    this.notifyListeners();

    // Setup timeout
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const progressHandler = (p: JobProgress) => {
        onProgress?.(p);
      };

      const result = await fn(controller.signal, progressHandler);

      clearTimeout(timeoutId);
      this.activeJobs.delete(id);
      this.notifyListeners();

      return { ok: true, data: result };
    } catch (error) {
      clearTimeout(timeoutId);
      this.activeJobs.delete(id);
      this.notifyListeners();

      if (controller.signal.aborted) {
        return { ok: false, error: 'Job was cancelled or timed out' };
      }

      const message = error instanceof Error ? error.message : 'Job failed';
      return { ok: false, error: message };
    }
  }

  /**
   * Cancel a specific job
   */
  cancelJob(id: string): boolean {
    const job = this.activeJobs.get(id);
    if (!job) return false;

    job.controller.abort();
    this.activeJobs.delete(id);
    this.notifyListeners();
    return true;
  }

  /**
   * Cancel all running jobs
   */
  cancelAllJobs(): void {
    for (const job of this.activeJobs.values()) {
      job.controller.abort();
    }
    this.activeJobs.clear();
    this.notifyListeners();
  }

  /**
   * Get list of active jobs
   */
  getActiveJobs(): ActiveJob[] {
    return Array.from(this.activeJobs.values());
  }

  /**
   * Check if a job is running
   */
  isJobRunning(id: string): boolean {
    return this.activeJobs.has(id);
  }

  /**
   * Subscribe to job changes
   */
  subscribe(listener: (jobs: ActiveJob[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const jobs = this.getActiveJobs();
    for (const listener of this.listeners) {
      listener(jobs);
    }
  }
}

// Singleton instance
export const jobManager = new JobManagerSingleton();

/**
 * Create a job ID for a tool
 */
export function createJobId(toolSlug: string, action: string): string {
  return `${toolSlug}:${action}:${Date.now()}`;
}

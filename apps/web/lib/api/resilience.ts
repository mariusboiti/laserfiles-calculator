/**
 * API Resilience Utilities
 * Timeout handling, error normalization, and retry logic
 */

// ============================================================================
// Error Types
// ============================================================================

export interface NormalizedError {
  title: string;
  message: string;
  code?: string;
  isRetryable: boolean;
  isRateLimit: boolean;
  isTimeout: boolean;
  isOffline: boolean;
  original?: unknown;
}

// ============================================================================
// Error Normalization
// ============================================================================

export function normalizeError(err: unknown): NormalizedError {
  // Offline check
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      title: 'You\'re offline',
      message: 'Please check your internet connection and try again.',
      code: 'OFFLINE',
      isRetryable: true,
      isRateLimit: false,
      isTimeout: false,
      isOffline: true,
      original: err,
    };
  }

  // Timeout error
  if (err instanceof TimeoutError) {
    return {
      title: 'Request timed out',
      message: 'The operation is taking longer than expected. Please try again.',
      code: 'TIMEOUT',
      isRetryable: true,
      isRateLimit: false,
      isTimeout: true,
      isOffline: false,
      original: err,
    };
  }

  // Fetch/network errors
  if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('network'))) {
    return {
      title: 'Connection error',
      message: 'Unable to connect to the server. Please check your connection.',
      code: 'NETWORK_ERROR',
      isRetryable: true,
      isRateLimit: false,
      isTimeout: false,
      isOffline: false,
      original: err,
    };
  }

  // API response errors
  if (err instanceof ApiError) {
    // Rate limit
    if (err.status === 429) {
      return {
        title: 'Too many requests',
        message: 'AI is temporarily busy or you hit a limit. Please try again in a minute.',
        code: 'RATE_LIMIT',
        isRetryable: true,
        isRateLimit: true,
        isTimeout: false,
        isOffline: false,
        original: err,
      };
    }

    // Quota exceeded
    if (err.status === 402 || err.message.toLowerCase().includes('quota') || err.message.toLowerCase().includes('credit')) {
      return {
        title: 'Quota exceeded',
        message: 'You\'ve reached your usage limit. Please upgrade or wait for your quota to reset.',
        code: 'QUOTA_EXCEEDED',
        isRetryable: false,
        isRateLimit: false,
        isTimeout: false,
        isOffline: false,
        original: err,
      };
    }

    // Server errors (5xx)
    if (err.status >= 500) {
      return {
        title: 'Server error',
        message: 'Something went wrong on our end. Please try again.',
        code: `SERVER_${err.status}`,
        isRetryable: true,
        isRateLimit: false,
        isTimeout: false,
        isOffline: false,
        original: err,
      };
    }

    // Client errors (4xx)
    if (err.status >= 400) {
      return {
        title: 'Request failed',
        message: err.message || 'The request could not be processed.',
        code: `CLIENT_${err.status}`,
        isRetryable: false,
        isRateLimit: false,
        isTimeout: false,
        isOffline: false,
        original: err,
      };
    }
  }

  // Generic Error
  if (err instanceof Error) {
    return {
      title: 'Something went wrong',
      message: err.message || 'An unexpected error occurred. Please try again.',
      code: 'UNKNOWN',
      isRetryable: true,
      isRateLimit: false,
      isTimeout: false,
      isOffline: false,
      original: err,
    };
  }

  // Unknown error type
  return {
    title: 'Something went wrong',
    message: 'An unexpected error occurred. Please try again.',
    code: 'UNKNOWN',
    isRetryable: true,
    isRateLimit: false,
    isTimeout: false,
    isOffline: false,
    original: err,
  };
}

// ============================================================================
// Custom Error Classes
// ============================================================================

export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`Request timed out after ${ms}ms`);
    this.name = 'TimeoutError';
  }
}

export class ApiError extends Error {
  status: number;
  
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// ============================================================================
// Timeout Wrapper
// ============================================================================

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  onTimeout?: () => void
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      onTimeout?.();
      reject(new TimeoutError(ms));
    }, ms);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (err) {
    clearTimeout(timeoutId!);
    throw err;
  }
}

// ============================================================================
// Resilient Fetch
// ============================================================================

export interface ResilientFetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export async function resilientFetch(
  url: string,
  options: ResilientFetchOptions = {}
): Promise<Response> {
  const {
    timeout = 30000,
    retries = 0,
    retryDelay = 1000,
    ...fetchOptions
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await withTimeout(
        fetch(url, fetchOptions),
        timeout
      );

      // Throw on non-ok responses so they can be retried if needed
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new ApiError(text || response.statusText, response.status);
      }

      return response;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Don't retry on client errors (4xx) except rate limits
      if (err instanceof ApiError && err.status >= 400 && err.status < 500 && err.status !== 429) {
        throw err;
      }

      // If we have more retries, wait and try again
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    }
  }

  throw lastError;
}

// ============================================================================
// AI Generation Defaults
// ============================================================================

export const AI_TIMEOUT_MS = 60000; // 60 seconds for AI generation
export const AI_RETRY_DELAY_MS = 2000;
export const AI_MAX_RETRIES = 1;

export function getAITimeoutMessage(): string {
  return 'Generation is taking longer than usual. Please try again.';
}

export function getRateLimitMessage(): string {
  return 'AI is temporarily busy or you hit a limit. Please try again in a minute.';
}

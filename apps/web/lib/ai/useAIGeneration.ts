'use client';

/**
 * AI Generation Hook with Resilience
 * Handles timeouts, rate limits, and retry UX
 */

import { useState, useCallback, useRef } from 'react';
import { 
  withTimeout, 
  normalizeError, 
  AI_TIMEOUT_MS,
  type NormalizedError 
} from '@/lib/api/resilience';

// ============================================================================
// Types
// ============================================================================

export type AIGenerationStatus = 'idle' | 'generating' | 'success' | 'error';

export interface AIGenerationState<T> {
  status: AIGenerationStatus;
  result: T | null;
  error: NormalizedError | null;
  isGenerating: boolean;
  canRetry: boolean;
}

export interface AIGenerationActions<T> {
  generate: () => Promise<T | null>;
  retry: () => Promise<T | null>;
  reset: () => void;
  clearError: () => void;
}

export interface UseAIGenerationOptions<T> {
  generateFn: () => Promise<T>;
  onSuccess?: (result: T) => void;
  onError?: (error: NormalizedError) => void;
  timeoutMs?: number;
  keepPreviousResult?: boolean;
}

// ============================================================================
// Hook
// ============================================================================

export function useAIGeneration<T>(
  options: UseAIGenerationOptions<T>
): AIGenerationState<T> & AIGenerationActions<T> {
  const {
    generateFn,
    onSuccess,
    onError,
    timeoutMs = AI_TIMEOUT_MS,
    keepPreviousResult = true,
  } = options;

  const [status, setStatus] = useState<AIGenerationStatus>('idle');
  const [result, setResult] = useState<T | null>(null);
  const [error, setError] = useState<NormalizedError | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const generateFnRef = useRef(generateFn);
  generateFnRef.current = generateFn;

  const generate = useCallback(async (): Promise<T | null> => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setStatus('generating');
    setError(null);
    
    if (!keepPreviousResult) {
      setResult(null);
    }

    try {
      const generationResult = await withTimeout(
        generateFnRef.current(),
        timeoutMs
      );

      setResult(generationResult);
      setStatus('success');
      onSuccess?.(generationResult);
      
      return generationResult;
    } catch (err) {
      const normalized = normalizeError(err);
      setError(normalized);
      setStatus('error');
      onError?.(normalized);
      
      return null;
    }
  }, [timeoutMs, keepPreviousResult, onSuccess, onError]);

  const retry = useCallback(async (): Promise<T | null> => {
    return generate();
  }, [generate]);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setStatus('idle');
    setResult(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    if (status === 'error') {
      setStatus('idle');
    }
  }, [status]);

  return {
    status,
    result,
    error,
    isGenerating: status === 'generating',
    canRetry: error?.isRetryable ?? false,
    generate,
    retry,
    reset,
    clearError,
  };
}

// ============================================================================
// AI Error Display Component Helper
// ============================================================================

export function getAIErrorMessage(error: NormalizedError): string {
  if (error.isTimeout) {
    return 'Generation is taking longer than usual. Please try again.';
  }
  
  if (error.isRateLimit) {
    return 'AI is temporarily busy or you hit a limit. Please try again in a minute.';
  }
  
  if (error.isOffline) {
    return 'You\'re offline. Please check your connection and try again.';
  }
  
  return error.message;
}

// ============================================================================
// Credits Helper
// ============================================================================

export interface CreditConsumption {
  consumed: boolean;
  reason?: string;
}

export function shouldConsumeCredits(
  requestSent: boolean,
  error: NormalizedError | null
): CreditConsumption {
  // Credits are only consumed if request was successfully sent to provider
  if (!requestSent) {
    return { consumed: false, reason: 'Request not sent' };
  }

  // If error occurred before reaching provider, don't consume
  if (error?.isOffline || error?.code === 'NETWORK_ERROR') {
    return { consumed: false, reason: 'Network error before provider' };
  }

  // If timeout, the request may have been processed - consider consumed
  if (error?.isTimeout) {
    return { consumed: true, reason: 'Request sent, timeout occurred' };
  }

  // Request sent successfully
  return { consumed: true };
}

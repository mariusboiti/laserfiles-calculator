'use client';

/**
 * AI Generation Status Component
 * Displays generation progress, errors, and retry options
 */

import React from 'react';
import { Loader2, AlertCircle, RefreshCw, Sparkles } from 'lucide-react';
import { type NormalizedError } from '@/lib/api/resilience';
import { getAIErrorMessage } from '@/lib/ai/useAIGeneration';

// ============================================================================
// Generation Progress
// ============================================================================

interface AIGenerationProgressProps {
  message?: string;
  className?: string;
}

export function AIGenerationProgress({ 
  message = 'Generating with AI...', 
  className = '' 
}: AIGenerationProgressProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative">
        <Sparkles className="h-5 w-5 text-violet-400" />
        <Loader2 className="absolute inset-0 h-5 w-5 animate-spin text-violet-400/50" />
      </div>
      <span className="text-sm text-slate-300">{message}</span>
    </div>
  );
}

// ============================================================================
// Generation Error
// ============================================================================

interface AIGenerationErrorProps {
  error: NormalizedError;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function AIGenerationError({ 
  error, 
  onRetry, 
  onDismiss,
  className = '' 
}: AIGenerationErrorProps) {
  const message = getAIErrorMessage(error);

  return (
    <div className={`rounded-lg border border-red-900/50 bg-red-950/30 p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-red-300">{message}</p>
          
          <div className="mt-3 flex flex-wrap gap-2">
            {error.isRetryable && onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 rounded-md bg-red-900/50 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-900/70 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Try again
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="rounded-md px-3 py-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Inline Generation Status (for use within forms)
// ============================================================================

interface AIInlineStatusProps {
  isGenerating: boolean;
  error: NormalizedError | null;
  onRetry?: () => void;
  onClearError?: () => void;
  generatingMessage?: string;
  className?: string;
}

export function AIInlineStatus({
  isGenerating,
  error,
  onRetry,
  onClearError,
  generatingMessage = 'Generating...',
  className = '',
}: AIInlineStatusProps) {
  if (isGenerating) {
    return (
      <div className={`flex items-center gap-2 text-violet-400 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-xs">{generatingMessage}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-xs text-red-400">{getAIErrorMessage(error)}</span>
        {error.isRetryable && onRetry && (
          <button
            onClick={onRetry}
            className="text-xs text-red-300 underline hover:text-red-200"
          >
            Retry
          </button>
        )}
        {onClearError && (
          <button
            onClick={onClearError}
            className="text-xs text-slate-500 hover:text-slate-400"
          >
            ×
          </button>
        )}
      </div>
    );
  }

  return null;
}

// ============================================================================
// Generate Button with Loading State
// ============================================================================

interface AIGenerateButtonProps {
  onClick: () => void;
  isGenerating: boolean;
  disabled?: boolean;
  label?: string;
  loadingLabel?: string;
  className?: string;
}

export function AIGenerateButton({
  onClick,
  isGenerating,
  disabled = false,
  label = 'Generate',
  loadingLabel = 'Generating...',
  className = '',
}: AIGenerateButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isGenerating}
      className={`
        inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium
        bg-violet-600 text-white hover:bg-violet-700
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-colors
        ${className}
      `}
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {loadingLabel}
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          {label}
        </>
      )}
    </button>
  );
}

'use client';

/**
 * Unified Async State Components
 * Consistent loading, error, and empty states across the app
 */

import React from 'react';
import { Loader2, AlertCircle, RefreshCw, Bug, Info } from 'lucide-react';

// ============================================================================
// Loading State
// ============================================================================

interface LoadingStateProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingState({ text = 'Loading...', size = 'md', className = '' }: LoadingStateProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  const textClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className={`flex items-center justify-center gap-3 ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin text-sky-400`} />
      <span className={`${textClasses[size]} text-slate-400`}>{text}</span>
    </div>
  );
}

// ============================================================================
// Loading Skeleton
// ============================================================================

interface LoadingSkeletonProps {
  lines?: number;
  className?: string;
}

export function LoadingSkeleton({ lines = 3, className = '' }: LoadingSkeletonProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 animate-pulse rounded bg-slate-800"
          style={{ width: `${Math.random() * 40 + 60}%` }}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Inline Error
// ============================================================================

interface InlineErrorProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onReport?: () => void;
  className?: string;
}

export function InlineError({
  title,
  message,
  onRetry,
  onReport,
  className = '',
}: InlineErrorProps) {
  return (
    <div className={`rounded-lg border border-red-900/50 bg-red-950/30 p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400 mt-0.5" />
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className="text-sm font-medium text-red-300">{title}</h4>
          )}
          <p className={`text-sm text-red-400/90 ${title ? 'mt-1' : ''}`}>
            {message}
          </p>
          
          {(onRetry || onReport) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {onRetry && (
                <RetryButton onClick={onRetry} size="sm" />
              )}
              {onReport && (
                <button
                  onClick={onReport}
                  className="inline-flex items-center gap-1.5 rounded-md border border-red-900/50 px-2.5 py-1.5 text-xs text-red-300 hover:bg-red-950/50 transition-colors"
                >
                  <Bug className="h-3.5 w-3.5" />
                  Report issue
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Inline Warning
// ============================================================================

interface InlineWarningProps {
  title?: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function InlineWarning({
  title,
  message,
  action,
  className = '',
}: InlineWarningProps) {
  return (
    <div className={`rounded-lg border border-amber-900/50 bg-amber-950/30 p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <Info className="h-5 w-5 flex-shrink-0 text-amber-400 mt-0.5" />
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className="text-sm font-medium text-amber-300">{title}</h4>
          )}
          <p className={`text-sm text-amber-400/90 ${title ? 'mt-1' : ''}`}>
            {message}
          </p>
          
          {action && (
            <button
              onClick={action.onClick}
              className="mt-2 text-xs text-amber-300 underline hover:text-amber-200"
            >
              {action.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Retry Button
// ============================================================================

interface RetryButtonProps {
  onClick: () => void;
  label?: string;
  size?: 'sm' | 'md';
  isLoading?: boolean;
  className?: string;
}

export function RetryButton({
  onClick,
  label = 'Try again',
  size = 'md',
  isLoading = false,
  className = '',
}: RetryButtonProps) {
  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs gap-1.5',
    md: 'px-3 py-2 text-sm gap-2',
  };

  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`inline-flex items-center rounded-md border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${sizeClasses[size]} ${className}`}
    >
      {isLoading ? (
        <Loader2 className={`${iconSize} animate-spin`} />
      ) : (
        <RefreshCw className={iconSize} />
      )}
      {label}
    </button>
  );
}

// ============================================================================
// Empty State
// ============================================================================

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 text-center ${className}`}>
      {icon && (
        <div className="mb-4 text-slate-500">
          {icon}
        </div>
      )}
      <h3 className="text-base font-medium text-slate-300">{title}</h3>
      {description && (
        <p className="mt-1.5 text-sm text-slate-500 max-w-sm">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Full Page Loading
// ============================================================================

interface FullPageLoadingProps {
  text?: string;
}

export function FullPageLoading({ text = 'Loading...' }: FullPageLoadingProps) {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <LoadingState text={text} size="lg" />
    </div>
  );
}

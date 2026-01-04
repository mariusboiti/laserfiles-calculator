'use client';

/**
 * Tool Error Boundary
 * Catches errors in tools and shows a friendly fallback
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, MessageSquare } from 'lucide-react';

interface Props {
  children: ReactNode;
  toolSlug?: string;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ToolErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    
    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Tool Error Boundary caught error:', error, errorInfo);
    }
  }

  handleReload = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleFeedback = (): void => {
    // Open report issue panel via custom event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-report-issue', { detail: { mode: 'problem' } }));
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] items-center justify-center p-8">
          <div className="w-full max-w-md rounded-xl border border-red-900/50 bg-red-950/30 p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-900/50">
              <AlertTriangle className="h-6 w-6 text-red-400" />
            </div>
            
            <h2 className="text-lg font-semibold text-red-300">
              This tool encountered an error
            </h2>
            
            <p className="mt-2 text-sm text-red-400/80">
              Something went wrong. Try reloading to continue.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-xs text-red-500 hover:text-red-400">
                  Show error details (dev only)
                </summary>
                <pre className="mt-2 max-h-32 overflow-auto rounded bg-slate-900 p-2 text-[10px] text-red-300">
                  {this.state.error.message}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                onClick={this.handleReload}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                <RefreshCw className="h-4 w-4" />
                Reload Tool
              </button>
              
              <button
                onClick={this.handleFeedback}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
              >
                <MessageSquare className="h-4 w-4" />
                Send Feedback
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC to wrap a component with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  toolSlug?: string
): React.FC<P> {
  return function WrappedComponent(props: P) {
    return (
      <ToolErrorBoundary toolSlug={toolSlug}>
        <Component {...props} />
      </ToolErrorBoundary>
    );
  };
}

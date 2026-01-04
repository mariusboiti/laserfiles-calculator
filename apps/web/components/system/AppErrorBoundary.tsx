'use client';

/**
 * Global App Error Boundary
 * Catches unhandled React errors and shows a friendly fallback
 * Prevents white screens of death
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  level?: 'app' | 'page' | 'section';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class AppErrorBoundary extends Component<Props, State> {
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
      console.error('AppErrorBoundary caught error:', error, errorInfo);
    }

    // Production telemetry stub - can be connected to error tracking service
    if (process.env.NODE_ENV === 'production') {
      this.logErrorTelemetry(error, errorInfo);
    }
  }

  logErrorTelemetry(error: Error, errorInfo: ErrorInfo): void {
    // Stub for production error telemetry
    // Can be connected to Sentry, LogRocket, etc.
    try {
      const payload = {
        message: error.message,
        stack: error.stack?.slice(0, 1000),
        componentStack: errorInfo.componentStack?.slice(0, 500),
        url: typeof window !== 'undefined' ? window.location.href : '',
        timestamp: new Date().toISOString(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      };
      
      // Log to console in production for now
      console.error('[Error Telemetry]', payload);
      
      // Future: send to error tracking endpoint
      // fetch('/api/telemetry/error', { method: 'POST', body: JSON.stringify(payload) });
    } catch {
      // Ignore telemetry errors
    }
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleReport = (): void => {
    // Open report issue panel via custom event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-report-issue', { detail: { mode: 'problem' } }));
    }
  };

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    const { level = 'app' } = this.props;

    if (this.state.hasError) {
      return (
        <div className={`flex items-center justify-center bg-slate-950 ${level === 'app' ? 'min-h-screen' : 'min-h-[400px]'} p-8`}>
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-900/30">
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>

            <h1 className="text-xl font-semibold text-slate-100">
              Something went wrong
            </h1>

            <p className="mt-3 text-sm text-slate-400">
              Please refresh the page. If the issue persists, report it from the tool.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-400">
                  Error details (dev only)
                </summary>
                <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-slate-950 p-3 text-[11px] text-red-300">
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={this.handleReload}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Reload Page
              </button>

              <button
                onClick={this.handleReport}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-5 py-2.5 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
              >
                <Bug className="h-4 w-4" />
                Report a Problem
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;

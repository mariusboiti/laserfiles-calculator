'use client';

import { useEffect } from 'react';

type AnyErrorPayload = {
  message?: string;
  stack?: string;
  source?: string;
  line?: number;
  column?: number;
  url?: string;
  timestamp?: string;
  userAgent?: string;
  type: 'error' | 'unhandledrejection';
};

function storePayload(payload: AnyErrorPayload) {
  try {
    (window as any).__LF_LAST_ERROR__ = payload;
  } catch {
    // ignore
  }
}

export function GlobalErrorLogger() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      const err = event.error as any;
      const payload: AnyErrorPayload = {
        type: 'error',
        message: err?.message ?? event.message,
        stack: err?.stack,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        timestamp: new Date().toISOString(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      };

      storePayload(payload);
      console.error('[GlobalError]', payload);
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason: any = (event as any).reason;
      const payload: AnyErrorPayload = {
        type: 'unhandledrejection',
        message: reason?.message ?? String(reason),
        stack: reason?.stack,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        timestamp: new Date().toISOString(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      };

      storePayload(payload);
      console.error('[UnhandledRejection]', payload);
    };

    const originalConsoleError = window.console.error.bind(window.console);
    const patchedConsoleError: typeof console.error = (...args: any[]) => {
      try {
        const first = args[0];
        if (
          typeof first === 'string' &&
          (first.startsWith('[GlobalError]') ||
            first.startsWith('[UnhandledRejection]') ||
            first.startsWith('[Error Telemetry]'))
        ) {
          return originalConsoleError(...args);
        }

        const errArg = args.find((a) => a instanceof Error) as Error | undefined;
        const msg = typeof first === 'string' ? first : errArg?.message;

        const looksLikeReact310 =
          typeof msg === 'string' &&
          (msg.includes('Minified React error #310') || msg.includes('react.dev/errors/310') || msg.includes('#310'));

        if (looksLikeReact310 || errArg) {
          const payload: AnyErrorPayload = {
            type: 'error',
            message: msg ?? String(first ?? 'console.error'),
            stack: errArg?.stack,
            url: typeof window !== 'undefined' ? window.location.href : undefined,
            timestamp: new Date().toISOString(),
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
          };
          storePayload(payload);
        }
      } catch {
        // ignore
      }

      return originalConsoleError(...args);
    };

    window.console.error = patchedConsoleError;

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      window.console.error = originalConsoleError;
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  return null;
}

export default GlobalErrorLogger;

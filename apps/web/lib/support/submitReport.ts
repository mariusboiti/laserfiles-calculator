/**
 * Report Submission Handler
 * Abstracted to support multiple backends (API, email, webhook, etc.)
 */

import { apiClient } from '@/lib/api-client';

export interface ReportContext {
  toolSlug?: string;
  toolName?: string;
  toolVersion?: string;
  appVersion?: string;
  buildHash?: string;
  browser: string;
  os: string;
  viewportWidth: number;
  viewportHeight: number;
  pageUrl: string;
  timestamp: string;
  userAgent: string;
}

export interface ReportPayload {
  mode: 'problem' | 'feedback';
  description: string;
  context: ReportContext;
  toolState?: unknown;
  screenshotDataUrl?: string;
  includeToolState: boolean;
  includeScreenshot: boolean;
}

export interface SubmitResult {
  success: boolean;
  ticketId?: string;
  error?: string;
}

/**
 * Collects browser/environment context automatically
 */
export function collectContext(toolSlug?: string, toolName?: string): ReportContext {
  const ua = navigator.userAgent;
  
  // Parse browser
  let browser = 'Unknown';
  if (ua.includes('Firefox/')) {
    browser = 'Firefox';
  } else if (ua.includes('Edg/')) {
    browser = 'Edge';
  } else if (ua.includes('Chrome/')) {
    browser = 'Chrome';
  } else if (ua.includes('Safari/')) {
    browser = 'Safari';
  }

  // Parse OS
  let os = 'Unknown';
  if (ua.includes('Windows')) {
    os = 'Windows';
  } else if (ua.includes('Mac OS')) {
    os = 'macOS';
  } else if (ua.includes('Linux')) {
    os = 'Linux';
  } else if (ua.includes('Android')) {
    os = 'Android';
  } else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) {
    os = 'iOS';
  }

  return {
    toolSlug,
    toolName,
    toolVersion: undefined, // Can be populated by tool if available
    appVersion: process.env.NEXT_PUBLIC_APP_VERSION || undefined,
    buildHash: process.env.NEXT_PUBLIC_BUILD_HASH || undefined,
    browser,
    os,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    pageUrl: window.location.href,
    timestamp: new Date().toISOString(),
    userAgent: ua,
  };
}

/**
 * Truncates tool state if it exceeds size limit
 */
function truncateToolState(state: unknown, maxBytes: number = 50000): unknown {
  try {
    const json = JSON.stringify(state);
    if (json.length <= maxBytes) {
      return state;
    }
    
    // Return truncated notice
    return {
      _truncated: true,
      _originalSize: json.length,
      _maxSize: maxBytes,
      _note: 'Tool state was too large and has been truncated',
    };
  } catch {
    return { _error: 'Failed to serialize tool state' };
  }
}

/**
 * Submits report to the backend
 * Currently uses the existing /api/feedback endpoint
 * Can be extended to support other backends
 */
export async function submitReport(payload: ReportPayload): Promise<SubmitResult> {
  try {
    const message = payload.description.trim().slice(0, 2000);
    const tool = payload.context.toolSlug || payload.context.toolName;

    const meta: Record<string, unknown> = {
      ...payload.context,
      reportMode: payload.mode,
      includeToolState: payload.includeToolState,
      includeScreenshot: payload.includeScreenshot,
    };

    if (payload.includeToolState && payload.toolState) {
      meta.toolState = truncateToolState(payload.toolState);
    }

    const res = await apiClient.post('/feedback', {
      type: payload.mode === 'problem' ? 'bug' : 'feedback',
      message,
      tool,
      pageUrl: payload.context.pageUrl,
      meta,
    });

    const ok = !!res.data?.ok;
    if (!ok) {
      return { success: false, error: 'Failed to submit report' };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to submit report:', error);

    const errAny = error as any;
    const status: number | undefined = errAny?.response?.status;
    const serverMessage = errAny?.response?.data?.message;
    const serverErrorMessage = errAny?.response?.data?.error?.message;

    const message =
      (typeof serverMessage === 'string' && serverMessage) ||
      (Array.isArray(serverMessage) && serverMessage[0]) ||
      (typeof serverErrorMessage === 'string' && serverErrorMessage) ||
      (typeof errAny?.message === 'string' && errAny.message) ||
      'Failed to submit report';

    return {
      success: false,
      error: status ? `${message} (HTTP ${status})` : message,
    };
  }
}

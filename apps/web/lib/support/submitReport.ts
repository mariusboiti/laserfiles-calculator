/**
 * Report Submission Handler
 * Abstracted to support multiple backends (API, email, webhook, etc.)
 */

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
    // Prepare attachments
    const attachments: Array<{ filename: string; mimeType: string; base64: string }> = [];

    // Add screenshot if included
    if (payload.includeScreenshot && payload.screenshotDataUrl) {
      const base64 = payload.screenshotDataUrl.split(',')[1];
      if (base64) {
        attachments.push({
          filename: 'preview-screenshot.jpg',
          mimeType: 'image/jpeg',
          base64,
        });
      }
    }

    // Add tool state if included
    if (payload.includeToolState && payload.toolState) {
      const truncated = truncateToolState(payload.toolState);
      const stateJson = JSON.stringify(truncated, null, 2);
      const base64 = btoa(unescape(encodeURIComponent(stateJson)));
      attachments.push({
        filename: 'tool-state.json',
        mimeType: 'application/json',
        base64,
      });
    }

    // Build title from description (first line or truncated)
    const descLines = payload.description.trim().split('\n');
    const title = descLines[0].slice(0, 100) || (payload.mode === 'problem' ? 'Problem Report' : 'Feedback');

    // Submit to existing feedback API
    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: payload.mode === 'problem' ? 'bug' : 'feature',
        toolSlug: payload.context.toolSlug || undefined,
        pageUrl: payload.context.pageUrl,
        title,
        message: payload.description,
        severity: payload.mode === 'problem' ? 'medium' : undefined,
        attachments,
        metadata: {
          ...payload.context,
          reportMode: payload.mode,
          includeToolState: payload.includeToolState,
          includeScreenshot: payload.includeScreenshot,
        },
      }),
    });

    const contentType = response.headers.get('content-type') || '';
    let data: any = null;
    let rawText: string | null = null;

    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      rawText = await response.text();
    }

    if (!response.ok) {
      return {
        success: false,
        error:
          data?.error?.message ||
          `Failed to submit report (HTTP ${response.status})${rawText ? `: ${rawText.slice(0, 200)}` : ''}`,
      };
    }

    if (!data?.ok) {
      return {
        success: false,
        error: data?.error?.message || 'Failed to submit report',
      };
    }

    return {
      success: true,
      ticketId: data.data?.id,
    };
  } catch (error) {
    console.error('Failed to submit report:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit report',
    };
  }
}

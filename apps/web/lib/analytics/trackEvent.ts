/**
 * Internal Event Tracking System
 * Privacy-focused analytics for understanding tool usage
 * No third-party trackers, no user identifiers, no personal data
 */

interface BaseEvent {
  type: 'tool_open' | 'tool_action' | 'tool_export' | 'ai_generate' | 'ai_save';
  toolSlug: string;
  timestamp: number;
}

interface ToolActionEvent extends BaseEvent {
  type: 'tool_action';
  action: 'generate' | 'upload' | 'import' | 'start';
}

interface ToolOpenEvent extends BaseEvent {
  type: 'tool_open';
}

interface ToolExportEvent extends BaseEvent {
  type: 'tool_export';
}

interface AIGenerateEvent extends BaseEvent {
  type: 'ai_generate';
}

interface AISaveEvent extends BaseEvent {
  type: 'ai_save';
}

export type Event = ToolActionEvent | ToolOpenEvent | ToolExportEvent | AIGenerateEvent | AISaveEvent;

interface StorageData {
  version: 1;
  events: Event[];
}

const STORAGE_KEY = 'lfp:events';
const MAX_EVENTS = 1000;
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Track an event in the internal analytics system
 * 
 * @param event - The event to track
 * @returns Promise<void>
 */
export async function trackEvent(event: Event): Promise<void> {
  try {
    // Skip tracking in development unless explicitly enabled
    if (isDevelopment && !localStorage.getItem('lfp:dev:analytics')) {
      return;
    }

    // Ensure we're on client side
    if (typeof window === 'undefined') {
      return;
    }

    // Add timestamp if not provided
    const eventWithTimestamp = {
      ...event,
      timestamp: event.timestamp || Date.now(),
    };

    // Get existing events
    const existing = getStoredEvents();
    
    // Add new event
    const updated = {
      version: 1 as const,
      events: [...existing.events, eventWithTimestamp],
    };

    // Trim to max events (keep newest)
    if (updated.events.length > MAX_EVENTS) {
      updated.events = updated.events.slice(-MAX_EVENTS);
    }

    // Store back to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    // Fail silently - never break the app
    console.warn('[Analytics] Failed to track event:', error);
  }
}

/**
 * Get all stored events
 */
export function getStoredEvents(): StorageData {
  try {
    if (typeof window === 'undefined') {
      return { version: 1, events: [] };
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { version: 1, events: [] };
    }

    const parsed = JSON.parse(stored);
    
    // Handle version migrations if needed
    if (parsed.version !== 1) {
      // Clear old format and start fresh
      localStorage.removeItem(STORAGE_KEY);
      return { version: 1, events: [] };
    }

    return parsed;
  } catch (error) {
    console.warn('[Analytics] Failed to get stored events:', error);
    return { version: 1, events: [] };
  }
}

/**
 * Clear all stored events
 */
export function clearEvents(): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (error) {
    console.warn('[Analytics] Failed to clear events:', error);
  }
}

/**
 * Get event statistics grouped by tool and type
 */
export function getEventStats(): Record<string, Record<string, number>> {
  const events = getStoredEvents().events;
  const stats: Record<string, Record<string, number>> = {};

  for (const event of events) {
    const tool = event.toolSlug;
    const type = event.type;

    if (!stats[tool]) {
      stats[tool] = {};
    }

    stats[tool][type] = (stats[tool][type] || 0) + 1;
  }

  return stats;
}

/**
 * Enable analytics in development (for testing)
 */
export function enableDevAnalytics(): void {
  if (isDevelopment) {
    localStorage.setItem('lfp:dev:analytics', 'true');
  }
}

/**
 * Disable analytics in development
 */
export function disableDevAnalytics(): void {
  if (isDevelopment) {
    localStorage.removeItem('lfp:dev:analytics');
  }
}

/**
 * Check if analytics is enabled
 */
export function isAnalyticsEnabled(): boolean {
  if (isDevelopment) {
    return !!localStorage.getItem('lfp:dev:analytics');
  }
  return true; // Always enabled in production
}

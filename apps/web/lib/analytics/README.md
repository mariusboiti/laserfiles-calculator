# Internal Analytics System

A minimal, privacy-focused event tracking system for understanding tool usage in LaserFilesPro Studio.

## Features

- **No third-party trackers** - 100% internal
- **Privacy-first** - No user identifiers, no personal data
- **Local storage** - Events stored in browser localStorage
- **Dev-only viewer** - Analytics viewer accessible via Ctrl+Shift+A (dev only)
- **Performance safe** - Never throws errors, fails silently
- **Zero backend dependencies** - Works entirely client-side

## Event Types

The system tracks these specific events:

1. **tool_open** - When a tool page is loaded
2. **tool_action** - Primary actions (generate, upload, import, start)
3. **tool_export** - When user exports/downloads files
4. **ai_generate** - When AI generation is triggered
5. **ai_save** - When AI-generated images are saved

## Usage

### Adding Analytics to a Tool

```tsx
'use client';

import { useAnalytics } from '@/lib/analytics/useAnalytics';

export function MyTool() {
  const analytics = useAnalytics('my-tool-slug');
  
  const handleGenerate = () => {
    // Track primary action
    analytics.trackAction('generate');
    
    // Your generate logic here...
  };
  
  const handleAIGeneration = async () => {
    // Track AI generation
    analytics.trackAIGeneration();
    
    // Your AI logic here...
  };
  
  const handleExport = () => {
    // Track export
    analytics.trackExport();
    
    // Your export logic here...
  };
  
  return (
    // Your tool UI...
  );
}
```

### Analytics Viewer (Dev Only)

In development mode, press **Ctrl+Shift+A** (or **Cmd+Shift+A** on Mac) to open the analytics viewer.

The viewer shows:
- Event counts by tool and type
- Recent events timeline
- Export functionality
- Clear data option
- Enable/disable toggle

### Development Settings

Analytics is disabled by default in development. To enable:

```tsx
import { enableDevAnalytics } from '@/lib/analytics/trackEvent';

// Enable analytics in development
enableDevAnalytics();
```

Or use the toggle in the analytics viewer (Ctrl+Shift+A).

## Storage

Events are stored in localStorage under the key `lfp:events`:

```json
{
  "version": 1,
  "events": [
    {
      "type": "tool_open",
      "toolSlug": "ai-depth-photo",
      "timestamp": 1704067200000
    }
  ]
}
```

- Maximum events: 1000 (oldest discarded when limit reached)
- Automatic version migration support
- Fail-safe error handling

## API Reference

### trackEvent(event)

Track an event in the analytics system.

```tsx
import { trackEvent } from '@/lib/analytics/trackEvent';

trackEvent({
  type: 'tool_open',
  toolSlug: 'my-tool',
  timestamp: Date.now()
});
```

### useAnalytics(toolSlug)

React hook for tracking events in a component.

```tsx
const analytics = useAnalytics('my-tool');

analytics.trackAction('generate');
analytics.trackAIGeneration();
analytics.trackExport();
analytics.trackAISave();
```

### Storage Functions

```tsx
import { getStoredEvents, getEventStats, clearEvents } from '@/lib/analytics/trackEvent';

// Get all stored events
const events = getStoredEvents();

// Get aggregated statistics
const stats = getEventStats();

// Clear all events
clearEvents();
```

## Privacy & Safety

- ✅ No user identifiers
- ✅ No personal data
- ✅ No IP tracking
- ✅ No persistence across browsers
- ✅ No cookies required
- ✅ Silent failure (never breaks the app)
- ✅ Development mode controls

## Future-Proofing

The system is structured to easily support future backend integration:

1. Event format is standardized
2. Storage abstraction allows easy backend sync
3. Version support for data migrations
4. Export functionality for data analysis

## Implementation Status

- ✅ Core tracking utility
- ✅ Local storage implementation
- ✅ Dev-only analytics viewer
- ✅ Keyboard shortcut (Ctrl+Shift+A)
- ✅ React hooks for easy integration
- ✅ Error handling and safety
- ✅ Partial tool instrumentation

### Instrumented Tools

- ✅ AI Depth Photo
- ✅ BoxMaker
- ✅ Bulk Name Tags
- 🔄 Other tools (in progress)

## Adding to New Tools

1. Import `useAnalytics` hook
2. Call `useAnalytics('tool-slug')` at component start
3. Track events at appropriate points:
   - Tool open (automatic via hook)
   - Primary actions with `trackAction()`
   - AI generation with `trackAIGeneration()`
   - Exports with `trackExport()`
   - AI saves with `trackAISave()`

That's it! The system handles everything else automatically.

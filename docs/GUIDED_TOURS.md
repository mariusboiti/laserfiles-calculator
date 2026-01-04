# Guided Tours System

Interactive guided tours for LaserFilesPro Studio tools, helping users learn features step-by-step.

## Overview

- **Per-tool tours**: Each tool has its own tour configuration with 4-6 steps
- **Stable targeting**: Uses `data-tour` attributes instead of CSS selectors
- **Persistent progress**: Server-side storage with localStorage fallback
- **Auto-suggestion**: First-time users see a suggestion to take the tour

## Database Setup

Run Prisma migration to create the TourProgress table:

```bash
cd apps/web
npx prisma migrate dev --name add_tour_progress
npx prisma generate
```

## Architecture

### Files

| Path | Purpose |
|------|---------|
| `prisma/schema.prisma` | TourProgress model |
| `app/api/tours/progress/route.ts` | GET/POST progress API |
| `lib/tours/types.ts` | TypeScript types |
| `lib/tours/registry.ts` | Tour config registry |
| `lib/tours/useTour.ts` | React hook for tour state |
| `lib/tours/configs/*.ts` | Per-tool tour configurations |
| `components/tours/TourOverlay.tsx` | Step popover UI |
| `components/tours/TourLauncher.tsx` | Start/Replay button |
| `components/tours/TourSuggestion.tsx` | First-time prompt |

### Tour Status

```typescript
type TourStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
```

## Adding Tours to a Tool

### 1. Add data-tour attributes

Add `data-tour` attributes to key UI elements:

```tsx
<section data-tour="settings">
  {/* Settings panel */}
</section>

<div data-tour="canvas">
  {/* Preview/canvas area */}
</div>

<button data-tour="export">
  Export
</button>
```

Common targets:
- `settings` - Main settings panel
- `canvas` - Preview/canvas area
- `export` - Export button (already in ToolShell)
- `presets` - Presets/templates section
- `upload` - File upload area

### 2. Create tour config

Create `lib/tours/configs/my-tool.ts`:

```typescript
import type { TourConfig } from '../types';

export const myToolTour: TourConfig = {
  toolSlug: 'my-tool',
  steps: [
    {
      id: 'intro',
      target: 'settings',
      titleKey: 'tour.my-tool.intro.title',
      bodyKey: 'tour.my-tool.intro.body',
      titleFallback: 'Welcome to My Tool',
      bodyFallback: 'Description of what this tool does...',
      placement: 'right',
    },
    // Add 4-5 more steps...
  ],
};
```

### 3. Register tour

Add to `lib/tours/registry.ts`:

```typescript
import { myToolTour } from './configs/my-tool';

const tourRegistry: Record<string, TourConfig> = {
  // ...existing tours
  'my-tool': myToolTour,
};
```

### 4. ToolShell handles the rest

The tour launcher button automatically appears if:
- Tool has a tour registered in the registry
- `toolSlug` prop is passed to ToolShell

## API Endpoints

### GET /api/tours/progress

Query params:
- `toolSlug` (required)

Response:
```json
{
  "ok": true,
  "data": {
    "toolSlug": "boxmaker",
    "status": "COMPLETED",
    "lastStepIndex": 5
  }
}
```

### POST /api/tours/progress

Body:
```json
{
  "toolSlug": "boxmaker",
  "status": "COMPLETED",
  "lastStepIndex": 5
}
```

## Tour Step Placement

```typescript
type TourPlacement = 'top' | 'bottom' | 'left' | 'right' | 'auto';
```

- `auto` (default): Chooses placement with most available space
- Fixed placements: Use when auto doesn't work well

## Keyboard Navigation

- **Escape**: Close tour
- **Enter** / **→**: Next step (or Finish on last step)
- **←**: Previous step

## Internationalization

Tour configs use `titleKey` and `bodyKey` for i18n lookup:
- If i18n returns a translation, it's used
- Otherwise, `titleFallback` / `bodyFallback` strings are displayed

## Available Tours

| Tool | Slug | Steps |
|------|------|-------|
| BoxMaker | `boxmaker` | 6 |
| Panel Splitter | `panel-splitter` | 5 |
| Bulk Name Tags | `bulk-name-tags` | 5 |
| EngravePrep | `engraveprep` | 5 |
| Sign Generator | `personalised-sign-generator` | 5 |
| Jigsaw Maker | `jigsaw-maker` | 5 |
| AI Depth Photo | `ai-depth-photo` | 5 |

## Behavior Notes

1. **First visit**: Shows suggestion toast after 1.5s delay
2. **Skip**: Sets status to SKIPPED, hides suggestion on next visit
3. **Complete**: Sets status to COMPLETED, shows "Replay Tour" button
4. **Replay**: Restarts from step 0, doesn't change status until finished
5. **Missing target**: Shows warning, allows skipping to next step

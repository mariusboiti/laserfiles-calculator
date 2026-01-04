# Artifacts System

The Artifacts system allows users to save laser file exports (SVG/DXF/PDF) from any Studio tool and import them into other tools like the Price Calculator.

## Overview

- **Save to Library**: Any tool that exports SVG/DXF can save designs to the artifact library
- **Import into Price Calculator**: Select artifacts to auto-populate line items with dimensions
- **Browse Library**: View and manage all saved artifacts at `/studio/library`

## Database Setup

Run Prisma migration to create the Artifact table:

```bash
cd apps/web
npx prisma migrate dev --name add_artifacts
npx prisma generate
```

## File Storage

Artifacts are stored in `apps/web/public/uploads/artifacts/{userId}/{artifactId}/`:
- `design.svg` - Sanitized SVG file
- `design.dxf` - DXF file (if provided)
- `design.pdf` - PDF file (if provided)
- `preview.png` - Preview image (if provided)

For production, implement S3/R2 storage by modifying `lib/storage/server.ts`.

## API Endpoints

### Create Artifact
```
POST /api/artifacts
Body: {
  toolSlug: string,
  name: string,
  description?: string,
  svg?: string,
  dxfBase64?: string,
  pdfBase64?: string,
  previewPngBase64?: string,
  meta?: { bboxMm?, operations?, thickness?, kerf?, notes? }
}
```

### List Artifacts
```
GET /api/artifacts?q=search&toolSlug=boxmaker&limit=20&cursor=xxx
```

### Get Single Artifact
```
GET /api/artifacts/{id}
```

### Delete Artifact
```
DELETE /api/artifacts/{id}
```

## Adding to a Tool

### 1. Import the hook and dialog

```tsx
import { useExportArtifact, showArtifactSavedToast } from '@/lib/tools/export/useExportArtifact';
import { SaveArtifactDialog } from '@/components/artifacts';
```

### 2. Set up the hook

```tsx
const {
  isSaveDialogOpen,
  openSaveDialog,
  closeSaveDialog,
  saveAsArtifact,
  getExportPayload,
} = useExportArtifact({
  toolSlug: 'my-tool',
  defaultName: 'My Design',
  getExportPayload: async () => ({
    svg: getSvgString(), // Your export function
    meta: {
      bboxMm: { width: 100, height: 50 },
    },
  }),
});
```

### 3. Add buttons and dialog

```tsx
<button onClick={openSaveDialog}>
  Save to Library
</button>

<SaveArtifactDialog
  open={isSaveDialogOpen}
  onClose={closeSaveDialog}
  toolSlug="my-tool"
  defaultName="My Design"
  getExportData={getExportPayload}
  onSaved={(artifact) => {
    showArtifactSavedToast(artifact.name);
  }}
/>
```

## Price Calculator Integration

### Add the "Add from Studio" button

```tsx
import { AddFromStudioButton, mapArtifactToLineItem } from '@/components/artifacts';

function QuotesPage() {
  const handleArtifactSelected = (artifact) => {
    const lineItem = mapArtifactToLineItem(artifact);
    // Add to your state
    addLineItem({
      name: lineItem.name,
      widthMm: lineItem.widthMm,
      heightMm: lineItem.heightMm,
      quantity: lineItem.quantity,
      notes: lineItem.notes,
    });
  };

  return (
    <AddFromStudioButton onArtifactSelected={handleArtifactSelected} />
  );
}
```

### Deep Link Import

Users can import artifacts via URL:
```
/studio/tools/price-calculator/quotes?importArtifactId=xxx
```

Or via sessionStorage (used by "Add to Price Calculator" button in library).

## SVG Processing

The system automatically:
- Sanitizes SVG (removes scripts, images, external refs)
- Extracts dimensions from width/height attributes or viewBox
- Detects operation types (cuts, scores, engraves) from colors/styles

## Artifact Metadata

```typescript
interface ArtifactMeta {
  bboxMm?: { width: number; height: number };
  operations?: {
    hasCuts?: boolean;
    hasScores?: boolean;
    hasEngraves?: boolean;
  };
  pathCount?: number;
  thickness?: number;
  kerf?: number;
  notes?: string;
}
```

## Components

| Component | Description |
|-----------|-------------|
| `ArtifactPickerModal` | Modal for browsing and selecting artifacts |
| `SaveArtifactDialog` | Dialog for saving current export |
| `AddFromStudioButton` | Button that opens picker and handles import |

## Library Page

The artifact library is available at `/studio/library` and provides:
- Search and filter by tool
- Preview thumbnails
- Download SVG/DXF files
- Add to Price Calculator
- Delete artifacts

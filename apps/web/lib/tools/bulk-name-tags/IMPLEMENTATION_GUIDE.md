# Bulk Name Tags Polish v1 - Implementation Guide

## ✅ COMPLETED (Foundation Files)

### 1. Defaults & Validation
**File**: `config/defaults.ts`

- DEFAULTS constant with all dimensions
- DEMO_NAMES for reset
- Sanitization functions:
  - `sanitizeTagDimensions()`: 20-300mm
  - `sanitizeHole()`: 2-12mm diameter
  - `sanitizeFontSizes()`: 6-80pt
  - `sanitizeSheetDimensions()`: 100-2000mm
  - `sanitizeGaps()`: 0-30mm

### 2. Text Auto-Fit Helper
**File**: `core/textFit.ts`

- `approximateTextWidth()`: Character width estimation
- `fitFontSize()`: Binary search algorithm for optimal font size
- `calculateAvailableWidth()`: Considers padding and hole zone
- `validateTextFits()`: Check if text fits at minimum size

### 3. Help Content
**File**: `ui/BulkNameTagsHelp.tsx`

- Complete usage instructions
- Adding names (CSV/paste list)
- Recommended settings
- Export options
- Production tips

---

## ⚠️ REMAINING WORK (To Be Implemented)

### 4. Reset Functionality
**File to modify**: `src/App.tsx`

**Implementation**:
```typescript
import { DEFAULTS, DEMO_NAMES } from '../config/defaults';

interface AppProps {
  onResetCallback?: (callback: () => void) => void;
}

function App({ onResetCallback }: AppProps) {
  const resetToDefaults = useCallback(() => {
    setTemplateSvg(null);
    setTemplateSize(null);
    setNames(DEMO_NAMES.map(name => ({ name, line2: undefined })));
    setManualNamesText(DEMO_NAMES.join('\n'));
    setCsvData(null);
    setGeneratedContent(null);
    setPreviewSvg(null);
    
    // Reset configs to DEFAULTS
    setTextConfig({
      // ... use DEFAULTS values
    });
    
    setSheetConfig({
      sheetWidth: DEFAULTS.sheetW,
      sheetHeight: DEFAULTS.sheetH,
      horizontalSpacing: DEFAULTS.gapX,
      verticalSpacing: DEFAULTS.gapY,
      // ... other defaults
    });
  }, []);
  
  useEffect(() => {
    if (onResetCallback) {
      onResetCallback(resetToDefaults);
    }
  }, [onResetCallback, resetToDefaults]);
}
```

### 5. List Processing Improvements
**File to modify**: `src/components/ManualNamesInput.tsx` or `src/utils/manualNamesUtils.ts`

**Implementation**:
```typescript
export function processNameList(text: string, dedupe: boolean = true): {
  names: string[];
  totalInput: number;
  duplicatesRemoved: number;
} {
  // Split by newline, comma, semicolon
  const raw = text.split(/[\n,;]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  const totalInput = raw.length;
  
  let names = raw;
  let duplicatesRemoved = 0;
  
  if (dedupe) {
    const unique = [...new Set(raw)];
    duplicatesRemoved = raw.length - unique.length;
    names = unique;
  }
  
  // Limit to 500
  if (names.length > 500) {
    names = names.slice(0, 500);
  }
  
  return { names, totalInput, duplicatesRemoved };
}
```

**UI additions**:
- Add dedupe toggle checkbox
- Display "Total names: X"
- Display "Duplicates removed: Y" if dedupe enabled
- Warning badge if > 200 names

### 6. Validation & Warnings
**File to create**: `core/validation.ts`

**Implementation**:
```typescript
export function validateNameTags(config: {
  names: string[];
  tagWidth: number;
  tagHeight: number;
  holeDiameter: number;
  holeMargin: number;
  fontMin: number;
  fontMax: number;
  padding: number;
  sheetWidth: number;
  sheetHeight: number;
}): string[] {
  const warnings: string[] = [];
  
  // Check text length
  const maxWidth = calculateAvailableWidth(
    config.tagWidth,
    config.padding,
    true,
    config.holeDiameter,
    config.holeMargin
  );
  
  const tooLong = config.names.filter(name => 
    !validateTextFits(name, maxWidth, config.fontMin)
  );
  
  if (tooLong.length > 0) {
    warnings.push(`${tooLong.length} names too long even at minimum font size`);
  }
  
  // Check hole overlap
  const holeZone = config.holeDiameter + 2 * config.holeMargin;
  if (holeZone > config.tagWidth / 2) {
    warnings.push('Hole overlaps border - increase tag size or reduce hole/margin');
  }
  
  // Check sheet capacity
  const tagsPerRow = Math.floor(config.sheetWidth / (config.tagWidth + config.gapX));
  const tagsPerCol = Math.floor(config.sheetHeight / (config.tagHeight + config.gapY));
  const capacity = tagsPerRow * tagsPerCol;
  
  if (capacity < config.names.length) {
    warnings.push(`Sheet can fit only ${capacity} tags, but ${config.names.length} names provided`);
  }
  
  // Check name count
  if (config.names.length > 200) {
    warnings.push('More than 200 names - Export ZIP recommended for easier organization');
  }
  
  return warnings;
}
```

### 7. Export ZIP
**File to create**: `src/utils/exportZip.ts`

**Implementation**:
```typescript
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

export async function exportNameTagsZip(
  tags: Array<{ name: string; svg: string }>,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder('bulk-name-tags');
  
  if (!folder) throw new Error('Failed to create ZIP folder');
  
  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i];
    const filename = `tag-${sanitizeFilename(tag.name)}.svg`;
    folder.file(filename, tag.svg);
    onProgress?.(i + 1, tags.length);
  }
  
  const zipFilename = `bulk-name-tags-${tags.length}-tags.zip`;
  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, zipFilename);
}
```

**Integration in DownloadSection.tsx**:
- Add "Export ZIP" button
- Generate individual SVGs for each name
- Call `exportNameTagsZip()`

### 8. Preview Improvements
**File to modify**: `src/components/Preview.tsx`

**Implementation**:
- Add tabs: "Single Tag" and "Sheet Layout"
- Single Tag tab:
  - Dropdown to select name
  - Show 1 generated SVG
  - Use SvgPreview component
- Sheet Layout tab:
  - Show full sheet arrangement
  - Use SvgPreview component

### 9. ToolShell Integration
**File to modify**: `app/studio/tools/bulk-name-tags/page.tsx`

**Implementation**:
```typescript
'use client';

import { useRef } from 'react';
import { ToolShell } from '../../../../components/studio/ToolShell';
import { getToolBySlug } from '../../../../lib/studio/tools/registry';
import { BulkNameTagsHelp } from '../../../../lib/tools/bulk-name-tags/ui/BulkNameTagsHelp';

export default function BulkNameTagsPage() {
  const tool = getToolBySlug('bulk-name-tags');
  const resetCallbackRef = useRef<(() => void) | null>(null);
  
  if (!tool) return null;

  const Tool = tool.Component;

  const handleReset = () => {
    if (resetCallbackRef.current) {
      resetCallbackRef.current();
    }
  };

  return (
    <ToolShell
      slug={tool.slug}
      title={tool.title}
      description={tool.description}
      proFeatures={tool.proFeatures}
      onReset={handleReset}
      help={<BulkNameTagsHelp />}
    >
      <Tool onResetCallback={(callback: () => void) => { resetCallbackRef.current = callback; }} />
    </ToolShell>
  );
}
```

**File to modify**: `ui/BulkNameTagsTool.tsx`

```typescript
interface BulkNameTagsToolProps {
  onResetCallback?: (callback: () => void) => void;
}

export function BulkNameTagsTool({ onResetCallback }: BulkNameTagsToolProps) {
  return (
    <div className="lfs-tool lfs-tool-bulk-name-tags">
      <App onResetCallback={onResetCallback} />
    </div>
  );
}
```

---

## 📊 Implementation Progress

**Completed**: 3 / 9 tasks (33%)

**Foundation files created**:
1. ✅ config/defaults.ts
2. ✅ core/textFit.ts
3. ✅ ui/BulkNameTagsHelp.tsx

**Remaining integration work**:
4. ⚠️ Reset functionality in App.tsx
5. ⚠️ List processing improvements
6. ⚠️ Validation & warnings
7. ⚠️ Export ZIP
8. ⚠️ Preview improvements
9. ⚠️ ToolShell integration

---

## 🎯 Priority Order

### High Priority (Core Functionality):
1. Reset functionality (30 min)
2. ToolShell integration (15 min)
3. Export ZIP (45 min)

### Medium Priority (UX Improvements):
4. List processing with dedupe (30 min)
5. Validation & warnings display (45 min)

### Low Priority (Polish):
6. Preview improvements with tabs (60 min)

**Total Estimated Time**: 3-4 hours

---

## 🧪 Testing Checklist

### Reset Testing:
- [ ] Reset clears template
- [ ] Reset sets demo names (Mihai, Diana, Marius)
- [ ] Reset restores default dimensions
- [ ] Reset clears generated content

### List Processing:
- [ ] Paste list splits by newline
- [ ] Paste list splits by comma
- [ ] Trim spaces works
- [ ] Dedupe removes duplicates
- [ ] Shows "Total names: X"
- [ ] Shows "Duplicates removed: Y"
- [ ] Warning at 200+ names
- [ ] Limit at 500 names

### Export ZIP:
- [ ] ZIP filename: bulk-name-tags-{count}-tags.zip
- [ ] Folder structure: bulk-name-tags/tag-{name}.svg
- [ ] Filenames sanitized (no special chars)
- [ ] All names included
- [ ] SVGs are valid

### Validation:
- [ ] Warning for text too long
- [ ] Warning for hole overlap
- [ ] Warning for sheet capacity
- [ ] Warning for >200 names
- [ ] Warnings non-blocking

---

## 📝 Notes

- Tool already has complex functionality - focus on polish, not refactor
- Existing CSV upload and manual input work - enhance, don't replace
- Preview system exists - add tabs and SvgPreview integration
- Export system exists - add ZIP option alongside sheet export

---

**Created**: December 19, 2025
**Status**: Foundation complete, integration work pending
**Estimated completion time**: 3-4 hours

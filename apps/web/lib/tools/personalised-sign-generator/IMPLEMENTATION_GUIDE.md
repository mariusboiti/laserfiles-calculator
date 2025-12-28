# Personalised Sign Generator Polish v1 - Implementation Guide

## ✅ COMPLETED (Foundation Files)

### 1. Defaults & Validation
**File**: `config/defaults.ts`

- DEFAULTS constant with all parameters
- SIGN_PRESETS: Workshop Sign, Family Sign, Welcome Sign
- Sanitization functions:
  - `sanitizeSignDimensions()`: 80-2000mm
  - `sanitizeCornerRadius()`: 0-200mm
  - `sanitizeHole()`: 2-20mm diameter, 0-60mm margin
  - `sanitizePadding()`: 0-60mm

### 2. Text Auto-Fit Helper
**File**: `core/textFit.ts`

- `approximateTextWidth()`: Character width estimation (0.58 ratio)
- `fitFontSize()`: Binary search algorithm for optimal font size
- `calculateTextYPositions()`: Smart layout for 1-3 lines with safe zones
- `validateTextFits()`: Check if text fits at minimum size

**Key features**:
- Handles 1, 2, or 3 line combinations
- Adjusts Y positions based on which lines are present
- Accounts for top holes with safe zone offset
- Binary search for performance

### 3. Help Content
**File**: `ui/PersonalisedSignHelp.tsx`

- Complete usage instructions
- Recommended sizes (300×150, 500×250, 600×300)
- Mounting holes guide (5mm standard)
- Text engraving tips
- Material recommendations
- Laser settings guide

---

## ⚠️ REMAINING WORK (To Be Implemented)

### 4. Reset Functionality
**File to modify**: `ui/PersonalisedSignTool.tsx`

**Implementation**:
```typescript
import { DEFAULTS, SIGN_PRESETS } from '../config/defaults';

interface PersonalisedSignToolProps {
  onResetCallback?: (callback: () => void) => void;
}

export function PersonalisedSignTool({ onResetCallback }: PersonalisedSignToolProps) {
  // ... existing state ...
  
  const resetToDefaults = useCallback(() => {
    setShape(DEFAULTS.shape);
    setWidthMm(DEFAULTS.w);
    setHeightMm(DEFAULTS.h);
    setBorderEnabled(DEFAULTS.border);
    setHolesEnabled(DEFAULTS.holes);
    setHoleDiameterMm(DEFAULTS.holeD);
    setHolePosition(DEFAULTS.holeStyle);
    setLine1Text(DEFAULTS.line1);
    setLine2Text(DEFAULTS.line2);
    setLine3Text(DEFAULTS.line3);
    setLine1Style('normal');
    setLine2Style('bold');
    setLine3Style('normal');
  }, []);
  
  useEffect(() => {
    if (onResetCallback) {
      onResetCallback(resetToDefaults);
    }
  }, [onResetCallback, resetToDefaults]);
}
```

### 5. Apply Full Presets
**File to modify**: `ui/PersonalisedSignTool.tsx`

**Current**: Only applies width/height  
**Needed**: Apply all preset properties

```typescript
function applyPreset(preset: SignPresetConfig) {
  setWidthMm(preset.widthMm);
  setHeightMm(preset.heightMm);
  setShape(preset.shape);
  setLine1Text(preset.line1 || '');
  setLine2Text(preset.line2);
  setLine3Text(preset.line3 || '');
}
```

### 6. Validation & Warnings
**File to create**: `core/validation.ts`

```typescript
export function validateSign(config: {
  widthMm: number;
  heightMm: number;
  shape: SignShape;
  holesEnabled: boolean;
  holeDiameterMm: number;
  holeMargin: number;
  line1Text: string;
  line2Text: string;
  line3Text: string;
  fontMin: number;
}): string[] {
  const warnings: string[] = [];
  
  // Check hole fits in shape
  if (config.holesEnabled) {
    const minDim = Math.min(config.widthMm, config.heightMm);
    const holeZone = config.holeDiameterMm + 2 * config.holeMargin;
    
    if (holeZone > minDim / 2) {
      warnings.push('Holes too close to edge - increase margin or reduce hole size');
    }
    
    if (config.holeDiameterMm + config.holeMargin * 2 > minDim) {
      warnings.push('Hole does not fit inside shape');
    }
  }
  
  // Check text length
  const availableWidth = config.widthMm - 40; // Rough estimate with padding
  
  if (config.line2Text) {
    const fits = validateTextFits(config.line2Text, availableWidth, config.fontMin);
    if (!fits) {
      warnings.push('Main text too long even at minimum font size');
    }
  }
  
  // Check arch radius for arch shape
  if (config.shape === 'arch') {
    const minRadius = config.heightMm * 0.3;
    if (config.heightMm < 100) {
      warnings.push('Arch radius too small for height - increase height or use different shape');
    }
  }
  
  return warnings;
}
```

**Integration in UI**:
```typescript
const warnings = useMemo(() => {
  return validateSign({
    widthMm,
    heightMm,
    shape,
    holesEnabled,
    holeDiameterMm,
    holeMargin: 10, // From DEFAULTS
    line1Text,
    line2Text,
    line3Text,
    fontMin: DEFAULTS.fontMin,
  });
}, [widthMm, heightMm, shape, holesEnabled, holeDiameterMm, line1Text, line2Text, line3Text]);

// Display warnings
{warnings.length > 0 && (
  <div className="rounded-lg border border-amber-800 bg-amber-950/40 p-3">
    <div className="text-sm font-medium text-amber-300">Warnings</div>
    <ul className="mt-2 space-y-1 text-xs text-amber-200">
      {warnings.map((w, i) => (
        <li key={i}>• {w}</li>
      ))}
    </ul>
  </div>
)}
```

### 7. Integrate Text Auto-Fit
**File to modify**: `core/generateSignSvg.ts`

**Current**: Likely uses simple font sizing  
**Needed**: Use `fitFontSize()` from textFit.ts

```typescript
import { fitFontSize, calculateTextYPositions } from './textFit';

// In generateSignSvg function:
const availableWidth = widthMm - 2 * padding - (holesEnabled ? holeZone : 0);

// Calculate Y positions
const positions = calculateTextYPositions(
  heightMm,
  !!line1.text,
  !!line2.text,
  !!line3.text,
  holesEnabled && holePosition.includes('top'),
  holeDiameterMm,
  holeMargin
);

// Fit font sizes
const line1FontSize = line1.text 
  ? fitFontSize(line1.text, availableWidth, fontMin, fontMaxSmall)
  : 0;

const line2FontSize = line2.text
  ? fitFontSize(line2.text, availableWidth, fontMin, fontMaxMain)
  : 0;

const line3FontSize = line3.text
  ? fitFontSize(line3.text, availableWidth, fontMin, fontMaxSmall)
  : 0;

// Use positions.y1, positions.y2, positions.y3 for text placement
```

### 8. Preview with SvgPreview
**File to modify**: `ui/PersonalisedSignTool.tsx`

**Replace**:
```typescript
<div dangerouslySetInnerHTML={{ __html: svg }} />
```

**With**:
```typescript
import { SvgPreview } from '../../../../components/studio/SvgPreview';

<SvgPreview 
  svg={svg} 
  title="Sign Preview" 
  showGridToggle 
/>
```

### 9. Export Naming
**File to modify**: `core/generateSignSvg.ts`

**Update `generateFilename` function**:
```typescript
function sanitizeFilename(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 30);
}

export function generateFilename(shape: SignShape, mainText: string): string {
  const sanitized = sanitizeFilename(mainText || 'sign');
  return `personalised-sign-${shape}-${sanitized}.svg`;
}
```

**Update in PersonalisedSignTool.tsx**:
```typescript
function handleExport() {
  const filename = generateFilename(shape, line2Text);
  downloadTextFile(filename, svg, 'image/svg+xml');
}
```

**Disable export if line2 empty**:
```typescript
<button
  type="button"
  onClick={handleExport}
  disabled={!line2Text.trim()}
  className="w-full rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed"
>
  Export SVG
</button>
```

### 10. ToolShell Integration
**File to modify**: `app/studio/tools/personalised-sign-generator/page.tsx`

```typescript
'use client';

import { useRef } from 'react';
import { ToolShell } from '../../../../components/studio/ToolShell';
import { getToolBySlug } from '../../../../lib/studio/tools/registry';
import { PersonalisedSignHelp } from '../../../../lib/tools/personalised-sign-generator/ui/PersonalisedSignHelp';

export default function PersonalisedSignGeneratorPage() {
  const tool = getToolBySlug('personalised-sign-generator');
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
      help={<PersonalisedSignHelp />}
    >
      <Tool onResetCallback={(callback: () => void) => { resetCallbackRef.current = callback; }} />
    </ToolShell>
  );
}
```

---

## 📊 Implementation Progress

**Completed**: 3 / 10 tasks (30%)

**Foundation files created**:
1. ✅ config/defaults.ts
2. ✅ core/textFit.ts
3. ✅ ui/PersonalisedSignHelp.tsx

**Remaining integration work**:
4. ⚠️ Reset functionality (20 min)
5. ⚠️ Apply full presets (10 min)
6. ⚠️ Validation & warnings (45 min)
7. ⚠️ Integrate text auto-fit (60 min)
8. ⚠️ Preview with SvgPreview (15 min)
9. ⚠️ Export naming (20 min)
10. ⚠️ ToolShell integration (15 min)

**Total Estimated Time**: 3-4 hours

---

## 🧪 Testing Checklist

### Reset Testing:
- [ ] Reset clears all text
- [ ] Reset restores default dimensions (300×150)
- [ ] Reset restores default shape (rounded-rectangle)
- [ ] Reset restores default holes (enabled, 5mm)
- [ ] Reset sets default text (FAMILY NAME, EST. 2025)

### Presets Testing:
- [ ] Workshop Sign: 400×200, "WORKSHOP"
- [ ] Family Sign: 500×250, "THE POPESCU"
- [ ] Welcome Sign: 600×300, arch shape, "WELCOME"

### Text Auto-Fit:
- [ ] Short text uses large font
- [ ] Long text shrinks to fit
- [ ] Very long text uses minimum font
- [ ] Empty lines are skipped
- [ ] Y positions adjust based on line count

### Validation:
- [ ] Warning for holes too close to edge
- [ ] Warning for text too long
- [ ] Warning for arch radius too small
- [ ] Warnings non-blocking (can still export)

### Export:
- [ ] Filename: `personalised-sign-{shape}-{text}.svg`
- [ ] Export disabled if line2 empty
- [ ] SVG valid in LightBurn
- [ ] No guide lines in exported SVG

### Preview:
- [ ] SvgPreview shows zoom controls
- [ ] Grid toggle works
- [ ] Preview updates in real-time

---

## 📝 Notes

- Tool already has good structure - focus on polish, not refactor
- Text auto-fit is critical - current implementation may be simple
- Preview currently uses dangerouslySetInnerHTML - replace with SvgPreview
- Export naming needs sanitization
- Validation warnings improve UX significantly

---

**Created**: December 19, 2025  
**Status**: Foundation complete, integration work pending  
**Estimated completion time**: 3-4 hours

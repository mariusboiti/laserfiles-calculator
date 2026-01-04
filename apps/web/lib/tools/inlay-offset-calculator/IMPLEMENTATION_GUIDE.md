# Inlay Offset Calculator Polish v1 - Implementation Guide

## ✅ COMPLETED (Foundation Files)

### 1. Defaults & Validation
**File**: `config/defaults.ts`

- DEFAULTS constant with material thickness, kerf, extra clearance
- 4 presets: 3mm Plywood, 4mm Plywood, Acrylic 3mm, Fine Fit
- Sanitization functions for all parameters

### 2. Offset Calculation Logic
**File**: `core/offsetCalculation.ts`

- `calculateOffsets()`: Core formula implementation
  - baseOffset = kerf / 2
  - totalOffset = baseOffset + extraClearance
  - positiveOffset = +totalOffset (outward)
  - negativeOffset = -totalOffset (inward)
- `formatOffset()`: Display formatting with sign
- `generateCopyText()`: Copy-to-clipboard text generation
- Validation warnings for edge cases

### 3. Help Content
**File**: `ui/InlayOffsetHelp.tsx`

- Complete educational content
- What is inlay/marquetry
- Why offset calculation matters
- Step-by-step process
- Kerf values by material
- Assembly tips and common issues
- Project ideas

---

## ⚠️ REMAINING WORK (To Be Implemented)

### 4. Reset Functionality
**File to modify**: Main component

```typescript
import { DEFAULTS, INLAY_PRESETS } from '../config/defaults';

interface InlayOffsetCalculatorProps {
  onResetCallback?: (callback: () => void) => void;
}

const resetToDefaults = useCallback(() => {
  setMaterialThickness(DEFAULTS.materialThickness);
  setKerf(DEFAULTS.kerf);
  setExtraClearance(DEFAULTS.extraClearance);
  setUploadedSvg(null);
}, []);

useEffect(() => {
  if (onResetCallback) {
    onResetCallback(resetToDefaults);
  }
}, [onResetCallback, resetToDefaults]);
```

### 5. Preset Application
```typescript
function applyPreset(preset: InlayPresetConfig) {
  setMaterialThickness(preset.materialThickness);
  setKerf(preset.kerf);
  setExtraClearance(preset.extraClearance || 0);
}
```

### 6. Offset Calculation Integration
```typescript
import { calculateOffsets, formatOffset, generateCopyText } from '../core/offsetCalculation';

const offsetResult = useMemo(() => {
  return calculateOffsets({
    materialThickness,
    kerf,
    extraClearance,
  });
}, [materialThickness, kerf, extraClearance]);

// Display
<div>
  <p>Positive offset: {formatOffset(offsetResult.positiveOffset)}</p>
  <p>Negative offset: {formatOffset(offsetResult.negativeOffset)}</p>
</div>

// Warnings
{offsetResult.warnings.map(w => (
  <div key={w} className="text-amber-500">{w}</div>
))}
```

### 7. Copy Offsets Button
```typescript
const handleCopyOffsets = useCallback(() => {
  const text = generateCopyText(offsetResult);
  navigator.clipboard.writeText(text);
  // Show toast: "Offsets copied to clipboard"
}, [offsetResult]);

<button onClick={handleCopyOffsets}>
  Copy Offsets
</button>
```

### 8. Preview with Tabs
```typescript
import { SvgPreview } from '../../../../components/studio/SvgPreview';

const [activeTab, setActiveTab] = useState<'positive' | 'negative'>('positive');

// Generate SVGs with offsets applied
const positiveSvg = useMemo(() => {
  if (!uploadedSvg) return null;
  return applyOffset(uploadedSvg, offsetResult.positiveOffset);
}, [uploadedSvg, offsetResult.positiveOffset]);

const negativeSvg = useMemo(() => {
  if (!uploadedSvg) return null;
  return applyOffset(uploadedSvg, offsetResult.negativeOffset);
}, [uploadedSvg, offsetResult.negativeOffset]);

// UI
<div className="tabs">
  <button onClick={() => setActiveTab('positive')}>
    Positive (Inlay)
  </button>
  <button onClick={() => setActiveTab('negative')}>
    Negative (Base)
  </button>
</div>

<SvgPreview 
  svg={activeTab === 'positive' ? positiveSvg : negativeSvg}
  title={activeTab === 'positive' ? 'Inlay Piece' : 'Base Cutout'}
  showGridToggle
/>
```

### 9. Export ZIP
```typescript
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

async function handleExportZip() {
  if (!positiveSvg || !negativeSvg) return;
  
  const zip = new JSZip();
  const folder = zip.folder('inlay-offset');
  
  if (!folder) throw new Error('Failed to create ZIP folder');
  
  folder.file('inlay-positive.svg', positiveSvg);
  folder.file('inlay-negative.svg', negativeSvg);
  
  const zipFilename = `inlay-offset-t${materialThickness}-kerf${kerf}.zip`;
  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, zipFilename);
}
```

### 10. ToolShell Integration
**File**: `app/studio/tools/inlay-offset-calculator/page.tsx`

```typescript
'use client';

import { useRef } from 'react';
import { ToolShell } from '../../../../components/studio/ToolShell';
import { getToolBySlug } from '../../../../lib/studio/tools/registry';
import { InlayOffsetHelp } from '../../../../lib/tools/inlay-offset-calculator/ui/InlayOffsetHelp';

export default function InlayOffsetCalculatorPage() {
  const tool = getToolBySlug('inlay-offset-calculator');
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
      help={<InlayOffsetHelp />}
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
2. ✅ core/offsetCalculation.ts
3. ✅ ui/InlayOffsetHelp.tsx

**Remaining integration work**:
4. ⚠️ Reset functionality (15 min)
5. ⚠️ Preset application (10 min)
6. ⚠️ Offset calculation integration (20 min)
7. ⚠️ Copy offsets button (10 min)
8. ⚠️ Preview with tabs (45 min)
9. ⚠️ Export ZIP (30 min)
10. ⚠️ ToolShell integration (15 min)

**Total Estimated Time**: 2-3 hours

---

## 🧪 Testing Checklist

### Reset Testing:
- [ ] Reset clears all inputs to defaults
- [ ] Reset clears uploaded SVG
- [ ] Reset works from ToolShell button

### Preset Testing:
- [ ] 3mm Plywood preset applies correctly
- [ ] 4mm Plywood preset applies correctly
- [ ] Acrylic 3mm preset applies correctly
- [ ] Fine Fit preset sets negative clearance

### Offset Calculation:
- [ ] Base offset = kerf / 2
- [ ] Total offset = base + extra clearance
- [ ] Positive offset is positive value
- [ ] Negative offset is negative value
- [ ] Warnings display for edge cases

### Copy Offsets:
- [ ] Button copies formatted text
- [ ] Text includes both offsets
- [ ] Clipboard works correctly

### Preview:
- [ ] Positive tab shows inlay piece
- [ ] Negative tab shows base cutout
- [ ] SvgPreview zoom/fit works
- [ ] Original outline toggle works

### Export:
- [ ] ZIP contains 2 SVG files
- [ ] Filename: inlay-offset-t{thickness}-kerf{kerf}.zip
- [ ] SVGs are laser-safe (no fills, only paths)
- [ ] Both SVGs have correct offsets applied

---

## 📝 Notes

- Tool does NOT perform boolean operations in v1 (simple offset only)
- SVG offset can be implemented via stroke-width trick or path offset utility
- Focus on clear educational content - users need to understand WHY offsets matter
- Copy offsets button is small but valuable UX feature
- Test cut recommendation should be prominent

---

**Created**: December 19, 2025  
**Status**: Foundation complete, integration work pending  
**Estimated completion time**: 2-3 hours

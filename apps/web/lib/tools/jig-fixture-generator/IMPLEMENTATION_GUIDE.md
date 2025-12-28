# Jig & Fixture Generator Polish v1 - Implementation Guide

## ✅ COMPLETED (Foundation Files)

### 1. Defaults & Validation
**File**: `config/defaults.ts`

- DEFAULTS constant with all parameters
- 3 presets: 300×200 (12 pcs), A4 (20 pcs), Small Parts (30 pcs)
- Comprehensive sanitization functions

### 2. Layout Calculation
**File**: `core/layoutCalculation.ts`

- `calculateLayout()`: No overlap, proper centering
- Grid calculation with usable area
- Object position generation (row-major order)
- Overflow detection and warnings
- `generateLayoutSummary()`: Copy-to-clipboard text

### 3. Help Content
**File**: `ui/JigHelp.tsx`

- Complete educational content
- What is a jig/fixture
- Use cases and workflow
- Recommended settings
- Material recommendations
- Production workflow examples

---

## ⚠️ REMAINING WORK (To Be Implemented)

### 4. Reset Functionality
```typescript
import { DEFAULTS, JIG_PRESETS } from '../config/defaults';

const resetToDefaults = useCallback(() => {
  setBedW(DEFAULTS.bedW);
  setBedH(DEFAULTS.bedH);
  setMargin(DEFAULTS.margin);
  setRows(DEFAULTS.rows);
  setCols(DEFAULTS.cols);
  setGapX(DEFAULTS.gapX);
  setGapY(DEFAULTS.gapY);
  setObjectShape(DEFAULTS.objectShape);
  setObjectW(DEFAULTS.objectW);
  setObjectH(DEFAULTS.objectH);
  setHoleMode(DEFAULTS.holeMode);
  setNumbering(DEFAULTS.numbering);
  setNumberSize(DEFAULTS.numberSize);
  setCenter(DEFAULTS.center);
  setShowBedOutline(DEFAULTS.showBedOutline);
}, []);
```

### 5. Preset Application
```typescript
function applyPreset(preset: JigPresetConfig) {
  setBedW(preset.bedW);
  setBedH(preset.bedH);
  setRows(preset.rows);
  setCols(preset.cols);
  setObjectW(preset.objectW);
  setObjectH(preset.objectH);
}
```

### 6. Layout Calculation Integration
```typescript
import { calculateLayout, generateLayoutSummary } from '../core/layoutCalculation';

const layoutResult = useMemo(() => {
  return calculateLayout({
    bedW,
    bedH,
    margin,
    rows,
    cols,
    gapX,
    gapY,
    objectW,
    objectH,
    objectShape,
    center,
  });
}, [bedW, bedH, margin, rows, cols, gapX, gapY, objectW, objectH, objectShape, center]);

// Display warnings
{layoutResult.warnings.map(w => (
  <div key={w} className="text-amber-500">{w}</div>
))}
```

### 7. Copy Layout Summary
```typescript
const handleCopyLayout = useCallback(() => {
  const summary = generateLayoutSummary({
    bedW,
    bedH,
    rows,
    cols,
    objectW,
    objectH,
    gapX,
    gapY,
  });
  navigator.clipboard.writeText(summary);
  // Show toast: "Layout summary copied"
}, [bedW, bedH, rows, cols, objectW, objectH, gapX, gapY]);
```

### 8. SVG Generation
```typescript
function generateJigSvg(layout: LayoutResult, config: {
  bedW: number;
  bedH: number;
  objectW: number;
  objectH: number;
  objectShape: 'rect' | 'circle';
  holeMode: 'cut' | 'engrave';
  numbering: boolean;
  numberSize: number;
  showBedOutline: boolean;
}): string {
  let svg = `<svg width="${config.bedW}mm" height="${config.bedH}mm" viewBox="0 0 ${config.bedW} ${config.bedH}" xmlns="http://www.w3.org/2000/svg">`;
  
  // Bed outline (optional)
  if (config.showBedOutline) {
    svg += `<rect x="0" y="0" width="${config.bedW}" height="${config.bedH}" fill="none" stroke="#000" stroke-width="0.2"/>`;
  }
  
  // Objects
  for (const obj of layout.objects) {
    if (config.objectShape === 'rect') {
      const strokeStyle = config.holeMode === 'engrave' ? 'stroke-dasharray="2,2"' : '';
      svg += `<rect x="${obj.x}" y="${obj.y}" width="${config.objectW}" height="${config.objectH}" fill="none" stroke="#000" stroke-width="0.2" ${strokeStyle}/>`;
    } else {
      const r = Math.min(config.objectW, config.objectH) / 2;
      const cx = obj.x + config.objectW / 2;
      const cy = obj.y + config.objectH / 2;
      const strokeStyle = config.holeMode === 'engrave' ? 'stroke-dasharray="2,2"' : '';
      svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#000" stroke-width="0.2" ${strokeStyle}/>`;
    }
    
    // Numbering (if enabled)
    if (config.numbering) {
      const textX = obj.x + config.objectW / 2;
      const textY = obj.y + config.objectH / 2;
      svg += `<text x="${textX}" y="${textY}" text-anchor="middle" dominant-baseline="middle" font-size="${config.numberSize}" fill="none" stroke="#000" stroke-width="0.1">${obj.number}</text>`;
    }
  }
  
  svg += `</svg>`;
  return svg;
}
```

### 9. Preview with SvgPreview
```typescript
import { SvgPreview } from '../../../../components/studio/SvgPreview';

const previewSvg = useMemo(() => {
  return generateJigSvg(layoutResult, {
    bedW,
    bedH,
    objectW,
    objectH,
    objectShape,
    holeMode,
    numbering,
    numberSize,
    showBedOutline,
  });
}, [layoutResult, bedW, bedH, objectW, objectH, objectShape, holeMode, numbering, numberSize, showBedOutline]);

<SvgPreview 
  svg={previewSvg}
  title="Jig Preview"
  showGridToggle
/>
```

### 10. Export
```typescript
import { exportSvg } from '../../../utils/exportSvg';

function handleExport() {
  const filename = `jig-${rows}x${cols}-${bedW}x${bedH}`;
  exportSvg({ filenameBase: filename, svg: previewSvg });
}
```

### 11. ToolShell Integration
```typescript
// Same pattern as other tools
import { JigHelp } from '../../../../lib/tools/jig-fixture-generator/ui/JigHelp';

<ToolShell
  onReset={handleReset}
  help={<JigHelp />}
>
  <Tool onResetCallback={...} />
</ToolShell>
```

---

## 📊 Implementation Progress

**Completed**: 3 / 11 tasks (27%)

**Remaining**: 2-3 hours

---

## 🧪 Testing Checklist

- [ ] Reset works
- [ ] Presets apply correctly
- [ ] No overlap with valid inputs
- [ ] Centering works
- [ ] Warnings display correctly
- [ ] Copy layout summary works
- [ ] Numbering displays correctly
- [ ] Export naming correct
- [ ] SVG laser-safe

---

**Status**: Foundation complete, integration pending

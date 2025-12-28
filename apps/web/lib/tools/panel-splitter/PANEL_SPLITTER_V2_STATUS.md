# Panel Splitter V2 - Implementation Status

## ✅ Completed Features

### 1. Enhanced Configuration & Types
**Files Modified:**
- `config/defaults.ts` - Expanded bed presets from 3 to 9 common laser beds
- `src/types.ts` - Added `UnitSystem`, `tileOffsetX`, `tileOffsetY`, `boundaryRectEnabled`
- `src/App.tsx` - Updated default settings with v2 features

**Bed Presets Added:**
- K40 (300×200mm) - Common desktop laser
- A4 (210×297mm) - Standard paper size
- Glowforge Basic (495×279mm)
- Glowforge Pro (508×279mm)
- Thunder Laser Nova 24 (610×406mm)
- Thunder Laser Nova 35 (900×600mm)
- Epilog Zing 16 (406×305mm)
- Trotec Speedy 100 (610×305mm)
- Custom - User-defined dimensions

**Unit Conversion Utilities:**
- `mmToInch()` and `inchToMm()` functions
- `MM_TO_INCH` and `INCH_TO_MM` constants

### 2. Enhanced Settings UI Component
**File:** `src/components/Settings.tsx`

**New Controls Added:**

#### Unit System Toggle
- Two-button toggle: Millimeters (mm) ⟷ Inches (in)
- Visual active state with sky-600 background
- Positioned after Bed Size section

#### Tile Offset Controls (Advanced)
- Offset X input (-100 to +100mm, 0.5mm steps)
- Offset Y input (-100 to +100mm, 0.5mm steps)
- Helpful description: "Shift the tile grid to avoid seams in critical areas"
- Tooltips explaining horizontal/vertical offset usage

#### Boundary Rectangle Toggle
- Checkbox in Options section
- Label: "Add tile boundary rectangle"
- Tooltip: "Adds a rectangle layer showing exact tile boundaries for alignment in laser software"

#### Updated Numbering Format
- New default format: `panel_{row}{col}` → produces `panel_A1`, `panel_B2`, etc.
- Marked as "(Recommended)" in dropdown
- Maintains backward compatibility with existing formats:
  - R01C01 (Row-Column)
  - 01-01 (Row-Column)
  - Tile_001 (Sequential)

### 3. Default Settings Updated
**New Defaults:**
```typescript
{
  tileOffsetX: 0,
  tileOffsetY: 0,
  unitSystem: 'mm',
  numberingFormat: 'panel_{row}{col}',
  boundaryRectEnabled: false,
}
```

## 🔄 Pending Implementation

### 4. Grid Computation with Offset
**File:** `src/lib/svg/grid.ts`
**Task:** Apply `tileOffsetX` and `tileOffsetY` to grid calculation
**Details:**
- Shift tile positions by offset values
- Ensure offset doesn't break tile boundaries
- Update grid info to reflect offset application

### 5. Preview Canvas Enhancements
**File:** `src/components/PreviewCanvas.tsx`
**Tasks:**
- Draw visible tile grid overlay (dashed lines)
- Show tile labels (A1, A2, B1, B2) on each tile
- Add zoom controls UI (+/- buttons, fit button)
- Improve mouse wheel zoom support
- Highlight selected tile with colored border

### 6. Tile Generation with Boundary Rectangle
**File:** `src/lib/svg/tiler.ts`
**Task:** Add boundary rectangle layer when `settings.boundaryRectEnabled === true`
**Details:**
- Create `<rect>` element matching tile dimensions
- Use thin stroke (0.2mm), distinct color (e.g., red or magenta)
- Place in separate layer/group for easy laser software control
- Should not affect actual content cropping

### 7. Export File Naming
**Files:** `src/lib/svg/export.ts` and related
**Task:** Implement new naming format when `numberingFormat === 'panel_{row}{col}'`
**Format:** `panel_{rowLetter}{colNumber}_{tileW}x{tileH}mm.svg`
**Examples:**
- `panel_A1_300x200mm.svg` - Row A, Column 1, 300×200mm
- `panel_B3_495x279mm.svg` - Row B, Column 3, 495×279mm
- `panel_C2_610x406mm.svg` - Row C, Column 2, 610×406mm

**Row Letters:** A, B, C, D, ... (top to bottom)
**Column Numbers:** 1, 2, 3, 4, ... (left to right)
**Dimensions:** Always in mm for consistency

### 8. Uploader Component Enhancement
**File:** `src/components/Uploader.tsx`
**Tasks:**
- Add visual drag-and-drop zone styling
- Show highlight/border on dragover event
- Display file validation feedback
- Improve UX with clear drop target indication

### 9. Unit System Display Conversion
**Files:** Multiple components
**Task:** Display bed dimensions, margins, overlap in selected unit system
**Details:**
- Convert display values based on `settings.unitSystem`
- Keep internal calculations in mm
- Update labels dynamically (e.g., "Width (in)" when inches selected)
- Round to appropriate precision (mm: 1 decimal, in: 2 decimals)

## 🧪 Testing Checklist

- [ ] Upload SVG and verify preview renders correctly
- [ ] Change bed preset and verify dimensions update
- [ ] Toggle unit system mm→in and verify values convert (1mm ≈ 0.0394in)
- [ ] Adjust tile offset X/Y and verify grid shifts in preview
- [ ] Enable boundary rectangle and verify it appears in exported tiles
- [ ] Export tiles with new naming format and verify filenames
- [ ] Generate assembly map and verify grid visualization
- [ ] Test with large SVG (>1000mm) for performance
- [ ] Test with small overlap values (1-5mm)
- [ ] Test with registration marks enabled
- [ ] Verify backward compatibility with existing v1 settings

## 📊 Progress Summary

**Completed:** 3/9 major features (33%)
**Status:** Core UI enhancements complete, backend logic updates pending

**Next Priority:**
1. Grid computation with offset (enables offset functionality)
2. Preview canvas grid overlay (improves UX significantly)
3. Export file naming (production-ready output)

## 🎯 V2 Goals Achievement

| Goal | Status |
|------|--------|
| Live Preview with pan/zoom | ✅ Already exists in v1 |
| Visible tile grid overlay | ⏳ Pending |
| Bed size presets dropdown | ✅ Completed (9 presets) |
| mm/in unit toggle | ✅ UI complete, display conversion pending |
| Tile offset X/Y | ✅ UI complete, grid logic pending |
| Registration marks (corners) | ✅ Already exists in v1 |
| Boundary rectangle toggle | ✅ UI complete, tiler logic pending |
| Improved file naming | ✅ Format added, export logic pending |
| Drag-and-drop upload | ⏳ Pending styling |
| Assembly map | ✅ Already exists in v1 |
| ZIP export | ✅ Already exists in v1 |

## 🔧 Technical Implementation Notes

### Tile Offset Implementation Strategy
The offset should be applied in `computeGrid()` function:
```typescript
// Pseudo-code
const effectiveTileWidth = tileWidth - overlap;
const effectiveTileHeight = tileHeight - overlap;

for (let row = 0; row < rows; row++) {
  for (let col = 0; col < cols; col++) {
    const x = col * effectiveTileWidth + tileOffsetX;
    const y = row * effectiveTileHeight + tileOffsetY;
    // ... create tile
  }
}
```

### Boundary Rectangle Implementation
Add to tile SVG generation:
```typescript
if (settings.boundaryRectEnabled) {
  const boundaryRect = `<rect x="0" y="0" width="${tileWidth}" height="${tileHeight}" 
    fill="none" stroke="red" stroke-width="0.2" 
    id="tile-boundary" data-layer="boundary"/>`;
  // Prepend or append to tile SVG content
}
```

### File Naming Implementation
```typescript
function getTileFileName(tile: TileInfo, settings: Settings): string {
  if (settings.numberingFormat === 'panel_{row}{col}') {
    const rowLetter = String.fromCharCode(65 + tile.row); // A, B, C, ...
    const colNumber = tile.col + 1; // 1, 2, 3, ...
    const w = Math.round(tile.width);
    const h = Math.round(tile.height);
    return `panel_${rowLetter}${colNumber}_${w}x${h}mm.svg`;
  }
  // ... existing naming logic
}
```

## 📝 Notes for Future Development

- Consider adding metric/imperial preset beds (e.g., 12"×8" beds)
- Could add tile offset presets (e.g., "Center", "Top-Left", "Custom")
- Assembly map could show offset visualization
- Unit conversion could be extended to all numeric inputs
- Boundary rectangle color could be customizable
- File naming could include source filename prefix option

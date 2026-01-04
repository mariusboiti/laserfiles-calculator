# Panel Splitter V2 - Implementation Plan

## Overview
Upgrading Panel Splitter from v1 to v2 with production-quality features for laser bed tiling.

## V2 Enhancements Completed

### 1. Configuration & Types ✓
- Added `UnitSystem` type ('mm' | 'in')
- Added `tileOffsetX` and `tileOffsetY` to Settings
- Added `boundaryRectEnabled` toggle
- Added new numbering format: `'panel_{row}{col}'`
- Expanded bed presets with 9 common laser bed sizes
- Added unit conversion utilities (mmToInch, inchToMm)

### 2. Bed Size Presets ✓
- K40 (300×200mm)
- A4 (210×297mm)
- Glowforge Basic (495×279mm)
- Glowforge Pro (508×279mm)
- Thunder Laser Nova 24 (610×406mm)
- Thunder Laser Nova 35 (900×600mm)
- Epilog Zing 16 (406×305mm)
- Trotec Speedy 100 (610×305mm)
- Custom (user-defined)

## V2 Enhancements Pending

### 3. Settings Component Updates
**File:** `src/components/Settings.tsx`
- [ ] Add bed preset dropdown (replaces manual width/height entry initially)
- [ ] Add unit system toggle (mm ⟷ in) with live conversion
- [ ] Add tile offset X/Y number inputs (mm)
- [ ] Add boundary rectangle toggle checkbox
- [ ] Update layout for better organization

### 4. Preview Canvas Enhancements
**File:** `src/components/PreviewCanvas.tsx`
- [ ] Add visible tile grid overlay (dashed lines)
- [ ] Show tile labels (A1, A2, B1, B2, etc.) on grid
- [ ] Add zoom controls (+/- buttons, fit-to-view button)
- [ ] Improve pan/zoom UX with mouse wheel support
- [ ] Highlight selected tile with border

### 5. Uploader Component
**File:** `src/components/Uploader.tsx`
- [ ] Add drag-and-drop zone styling
- [ ] Show drop zone highlight on dragover
- [ ] Add file validation feedback

### 6. Grid Computation
**File:** `src/lib/svg/grid.ts`
- [ ] Apply tile offset X/Y to grid calculation
- [ ] Update grid to account for offset in tile positioning

### 7. Tile Generation
**File:** `src/lib/svg/tiler.ts`
- [ ] Add boundary rectangle layer when `boundaryRectEnabled` is true
- [ ] Update file naming to use new format: `panel_{rowLetter}{colNumber}_{tileW}x{tileH}mm.svg`
- [ ] Example: `panel_A1_300x200mm.svg`, `panel_B2_300x200mm.svg`

### 8. Export & Assembly Map
**File:** `src/lib/svg/export.ts` and `src/lib/svg/assemblyMap.ts`
- [ ] Update ZIP file naming to match new tile naming convention
- [ ] Enhance assembly map with clearer grid visualization
- [ ] Add tile dimensions to assembly map labels

## Implementation Priority

### Phase 1: Core UI Enhancements (High Priority)
1. Settings component with bed presets dropdown
2. Unit system toggle with conversion
3. Tile offset X/Y controls
4. Boundary rectangle toggle

### Phase 2: Preview Improvements (High Priority)
1. Visible tile grid overlay
2. Tile labels on preview
3. Enhanced zoom controls

### Phase 3: Export & Naming (Medium Priority)
1. New file naming format
2. Boundary rectangle in tiles
3. Enhanced assembly map

### Phase 4: Polish (Low Priority)
1. Drag-and-drop styling
2. Better validation feedback
3. Performance optimizations

## Technical Notes

### Unit Conversion
- All internal calculations remain in mm
- UI displays values in selected unit system
- Conversion happens at display/input boundaries
- 1 inch = 25.4mm

### Tile Offset
- Offset shifts the entire grid by X/Y mm
- Useful for avoiding seams in critical areas
- Applied before tile boundary calculation
- Does not change tile size, only position

### Boundary Rectangle
- Optional layer added to each tile SVG
- Shows exact tile boundary for alignment
- Rendered as a thin stroke rectangle
- Can be different color/layer for laser software

### File Naming Convention
- Format: `panel_{rowLetter}{colNumber}_{tileW}x{tileH}mm.svg`
- Row letters: A, B, C, ... (top to bottom)
- Column numbers: 1, 2, 3, ... (left to right)
- Dimensions always in mm for consistency
- Example: `panel_C4_300x200mm.svg` = row C, column 4, 300×200mm tile

## Testing Checklist
- [ ] Upload SVG and verify preview renders
- [ ] Change bed preset and verify dimensions update
- [ ] Toggle unit system and verify values convert correctly
- [ ] Adjust tile offset and verify grid shifts in preview
- [ ] Enable boundary rectangle and verify it appears in exported tiles
- [ ] Export tiles and verify file naming matches new format
- [ ] Generate assembly map and verify grid visualization
- [ ] Test with large SVG (>1000mm) to verify performance
- [ ] Test with small overlap values (1-5mm)
- [ ] Test with registration marks enabled

## Backward Compatibility
- Existing v1 settings will be migrated automatically
- New settings have sensible defaults
- Old numbering formats still supported
- Export format remains compatible with v1

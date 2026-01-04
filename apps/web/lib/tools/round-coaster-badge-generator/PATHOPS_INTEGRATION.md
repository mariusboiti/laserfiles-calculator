# PathOps Integration Plan for Round Coaster & Badge Generator V2

## Current Status

✅ **Completed:**
- Created shared PathOps geometry engine at `lib/geometry/pathops/`
- Moved PathKit modules from keychain to shared location
- Updated Keychain to use shared pathops module
- Created `pathopsBuilder.ts` with badge/coaster-specific builders

## Implementation Plan

### Phase 1: Add Badge Mode (Sticker-style)

**New Mode: `sticker-badge`**

1. **Add to types** (`types/coasterV2.ts`):
   ```typescript
   export type ShapeType = 'circle' | 'hex' | 'shield' | 'octagon' | 'scalloped' | 'sticker-badge';
   
   export interface BadgeConfig {
     mode: 'sticker' | 'round' | 'shield';
     stickerOffsetMm: number; // 2-5mm, default 3
     useBaseShape: boolean;   // false = sticker outline, true = circle/shield base
   }
   ```

2. **Update state** (`types/coasterV2.ts`):
   ```typescript
   export interface CoasterStateV2 {
     // ... existing fields
     badge?: BadgeConfig;
   }
   ```

3. **Modify build pipeline** (`core/generateSvgV2.ts`):
   - Check if `shape === 'sticker-badge'`
   - If yes, use `buildBadgeWithPathOps()` from `pathopsBuilder.ts`
   - Convert text to paths using `textToSvgPath()` (from keychain)
   - Pass text paths + icon paths to PathOps builder
   - Return CUT (outline) + ENGRAVE (text/icon) layers

4. **Text to paths conversion**:
   - Import `textToSvgPath` from `lib/tools/keychain/core/textToPath`
   - Convert all text elements to SVG paths
   - No `<text>` elements in final export

### Phase 2: Apply PathOps to Existing Shapes

**For circle/hex/octagon/shield:**

1. **Border generation**:
   - Replace simple `generateInnerShapePath()` with PathOps `strokeToPath()`
   - Use `buildShapeWithBorder()` from `pathopsBuilder.ts`
   - Ensures clean, laser-safe borders

2. **Hole subtraction**:
   - Use PathOps `difference()` instead of overlaying paths
   - Guarantees clean cutouts

3. **Double border**:
   - Create two offset paths using `strokeToPath()` with different widths
   - Union/difference as needed

### Phase 3: UI Updates

1. **Add Badge mode selector**:
   - Radio buttons: Coaster / Badge
   - If Badge: show sticker offset slider
   - If Badge: show icon picker (reuse from keychain)

2. **Layer visibility toggles**:
   - Show Base (Cut Layer)
   - Show Top (Engrave Layer)
   - Show Grid
   - Show Safe Zones

3. **Preview colors**:
   - CUT layer: red `#ff0000`
   - ENGRAVE layer: black `#000` with blue stroke `#0066ff`

### Phase 4: Export

1. **Laser-safe SVG**:
   - No `<text>` elements
   - Only `<path>` elements
   - Grouped by layer: `<g id="CUT">` and `<g id="ENGRAVE">`

2. **Export buttons**:
   - Combined (both layers)
   - Cut only
   - Engrave only

## File Structure

```
lib/geometry/pathops/           # Shared PathOps engine
├── loadPathOps.ts             # PathKit WASM loader
├── units.ts                   # mm <-> units conversion
├── cache.ts                   # LRU cache
└── index.ts                   # Exports

lib/tools/round-coaster-badge-generator/
├── core/
│   ├── generateSvgV2.ts       # Main build logic (UPDATE)
│   ├── pathopsBuilder.ts      # PathOps-specific builders (NEW)
│   ├── textFitV2.ts           # Text fitting
│   └── curvedText.ts          # Curved text
├── types/
│   └── coasterV2.ts           # Types (UPDATE - add BadgeConfig)
├── ui/
│   └── RoundCoasterToolV2.tsx # UI (UPDATE - add badge mode)
└── PATHOPS_INTEGRATION.md     # This file
```

## Migration Strategy

1. **Keep existing functionality working**
   - Don't break current coaster generation
   - Add badge mode as new feature

2. **Gradual rollout**
   - Phase 1: Add sticker-badge mode
   - Phase 2: Apply PathOps to existing shapes (optional enhancement)
   - Phase 3: UI polish

3. **Testing**
   - Test keychain with shared pathops (verify no regression)
   - Test badge mode with various text/icon combinations
   - Test existing coaster modes still work

## Next Steps

1. ✅ Create shared pathops module
2. ✅ Update keychain to use shared module
3. ✅ Create pathopsBuilder.ts
4. 🔄 Test keychain (verify shared module works)
5. ⏳ Add BadgeConfig to types
6. ⏳ Integrate pathopsBuilder into generateSvgV2
7. ⏳ Update UI for badge mode
8. ⏳ Test badge generation

## Notes

- PathKit WASM is lazy-loaded (only when needed)
- Cache is shared across all tools
- Text-to-path conversion reuses keychain's `textToSvgPath()`
- Icon library can be shared with keychain
- All geometry operations use PathOps (no Paper.js, no polygon flattening)

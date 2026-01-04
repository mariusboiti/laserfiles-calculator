# Jigsaw Maker V2 - PathOps WASM Rebuild

## Status: IN PROGRESS

This is a complete rebuild of the Jigsaw Maker using PathOps WASM for robust geometry operations.

## Implementation Progress

### ✅ Completed Components

1. **PathOps WASM Client** (`core/pathops/pathopsClient.ts`)
   - Lazy-loads PathKit from CDN
   - Wrapper for union, diff, intersect, xor, offset, simplify
   - Memory management with delete()
   - Client-side only, safe for Next.js

2. **Core Utilities**
   - `core/utils/rng.ts` - Seeded RNG (mulberry32)
   - `core/utils/svgPath.ts` - Path building, Bezier utilities
   - `core/utils/transforms.ts` - Matrix transformations, rotation

3. **Classic Round Knob Generator** (`core/knobClassic.ts`)
   - Ravensburger-style smooth knobs
   - Neck + bulb geometry with 7 Bezier segments
   - C1 continuity throughout
   - Controlled randomness (±8% depth, ±6% bulb, ±5% neck)
   - Symmetric design

4. **Edge Map System** (`core/edgeMap.ts`)
   - Shared edge generation (NO DUPLICATES)
   - Each interior edge generated once
   - Border edges are straight
   - Interior edges use classic knobs
   - Deterministic with seeded RNG per edge key

5. **Piece Builder** (`core/pieceBuilder.ts`)
   - Constructs closed paths from shared edges
   - Transforms edges to world coordinates
   - Handles rotation for vertical edges
   - Inverts edges for adjacent pieces
   - Ensures endpoint continuity

6. **Types** (`types/jigsawV2.ts`)
   - Complete type definitions
   - Settings, output, validation
   - Presets for sheets and fit modes
   - Defaults and limits

### 🚧 In Progress / TODO

1. **Main Orchestrator** (`core/generateJigsawSvg.ts`)
   - Coordinate all components
   - Apply PathOps offset for kerf/clearance
   - Generate final SVG with layers

2. **Layout Modes**
   - `core/layout/assembled.ts` - Assembled layout
   - `core/layout/packGrid.ts` - Packed grid layout

3. **Backing Board** (`core/backing/generateBacking.ts`)
   - Outer rectangle with margin
   - Hanging holes
   - Magnet holes

4. **Piece Numbering** (`core/numbering/placeIds.ts`)
   - A1, A2, B1, B2... style
   - Position within piece bbox
   - Engrave layer output

5. **Validation** (`core/utils/validate.ts`)
   - Sanity checks
   - Warning generation
   - Fit validation

6. **UI Components**
   - `ui/JigsawMakerTool.tsx` - Main tool shell
   - Panel components for controls
   - Preview with zoom/fit
   - Export buttons

7. **Testing & Polish**
   - LightBurn export validation
   - Diagnostics panel
   - Performance optimization

## Architecture

### Edge Map System (Critical)

**No Duplicate Lines:**
```
Horizontal edges: [row][col] between row r and r+1
Vertical edges: [row][col] between col c and c+1

For piece at (r,c):
- Top: horizontal[r][c] (forward)
- Bottom: horizontal[r+1][c] (inverted)
- Left: vertical[r][c] (forward)
- Right: vertical[r][c+1] (inverted)

Inverted = reversed + flipped Y (tab ↔ blank)
```

### Kerf & Clearance Model

```
offsetDelta = (+kerfMm/2) + (-clearanceMm)

Where:
- kerfMm > 0: compensate for laser kerf (outward)
- clearanceMm > 0: looser fit (shrink pieces)
- clearanceMm < 0: tighter fit (grow pieces)

Applied per piece AFTER building closed path using PathOps offset.
```

### Classic Knob Geometry

**7 Bezier Segments:**
1. Shoulder left (baseline → neck base)
2. Neck left (neck base → bulb start)
3. Bulb left arc (quarter circle)
4. Bulb top arc (quarter circle)
5. Bulb right arc (quarter circle)
6. Neck right (bulb → neck base)
7. Shoulder right (neck base → baseline)

**Proportions (relative to edge length L):**
- Neck width: 0.18 * L
- Bulb width: 0.42 * L
- Depth: 0.28 * L
- Shoulder: 0.10 * L

### SVG Output Structure

```xml
<svg width="Wmm" height="Hmm" viewBox="0 0 W H">
  <!-- Cut layer -->
  <g id="CUT_PIECES" fill="none" stroke="red" stroke-width="0.001">
    <path d="..." data-piece="0-0" />
    <path d="..." data-piece="0-1" />
    ...
  </g>
  
  <!-- Backing (optional) -->
  <g id="CUT_BACKING" fill="none" stroke="red" stroke-width="0.001">
    <path d="..." />
    <circle cx="..." cy="..." r="..." />
  </g>
  
  <!-- Numbering (optional) -->
  <g id="ENGRAVE_BACK" fill="black">
    <text x="..." y="..." data-piece="0-0">A1</text>
    ...
  </g>
  
  <!-- Guides (preview only, not exported) -->
  <g id="SHEET_GUIDE" stroke="blue" stroke-width="0.1" opacity="0.3">
    <rect x="0" y="0" width="..." height="..." />
  </g>
</svg>
```

## Key Features

### ✅ Implemented
- Shared edge map (no duplicate interior edges)
- Classic round knobs (Ravensburger-style)
- Smooth cubic Beziers with C1 continuity
- Deterministic generation (seeded RNG)
- Proper edge inversion for adjacent pieces
- Coordinate transformations for vertical edges

### 🚧 To Implement
- PathOps offset for kerf/clearance per piece
- Layout modes (assembled, packed grid)
- Backing board with holes
- Piece numbering layer
- Validation and warnings
- UI with all controls
- Export functionality
- Diagnostics panel

## Non-Negotiables

- ✅ No duplicate interior edges in output
- ✅ Smooth round knobs (not angular)
- ✅ Deterministic with seed
- 🚧 Kerf/clearance applied per piece (not per edge)
- 🚧 Laser-safe SVG (hairline strokes, closed paths)
- 🚧 LightBurn compatible

## Next Steps

1. Complete main orchestrator with PathOps integration
2. Implement layout modes
3. Add backing board generation
4. Create piece numbering system
5. Build validation utilities
6. Implement UI components
7. Add export functionality
8. Test with LightBurn

## File Structure

```
apps/web/lib/tools/jigsaw-maker/
├── types/
│   ├── jigsaw.ts (legacy)
│   └── jigsawV2.ts ✅
├── core/
│   ├── generateJigsawSvg.ts 🚧
│   ├── edgeMap.ts ✅
│   ├── knobClassic.ts ✅
│   ├── pieceBuilder.ts ✅
│   ├── pathops/
│   │   └── pathopsClient.ts ✅
│   ├── layout/
│   │   ├── assembled.ts 🚧
│   │   └── packGrid.ts 🚧
│   ├── backing/
│   │   └── generateBacking.ts 🚧
│   ├── numbering/
│   │   └── placeIds.ts 🚧
│   └── utils/
│       ├── rng.ts ✅
│       ├── svgPath.ts ✅
│       ├── transforms.ts ✅
│       └── validate.ts 🚧
└── ui/
    ├── JigsawMakerTool.tsx 🚧
    └── panels/ 🚧
```

## Testing Checklist

- [ ] Generate 4×5 puzzle at 200×150mm
- [ ] Verify no duplicate interior edges (zoom in SVG)
- [ ] Check knobs are smooth and round
- [ ] Test kerf/clearance changes fit
- [ ] Verify deterministic output (same seed → same puzzle)
- [ ] Import to LightBurn without errors
- [ ] Test packed layout fits in sheet
- [ ] Verify backing board generation
- [ ] Check piece numbering placement
- [ ] Validate all warnings work correctly

## Known Issues

None yet - implementation in progress.

## Migration Notes

This rebuild **replaces** the previous V3 implementation. The V3 files are preserved but the new V2 PathOps system is the recommended approach going forward.

Key differences:
- V3: Pure SVG path generation, no PathOps
- V2: PathOps WASM for offset operations
- V2 has proper per-piece kerf/clearance handling
- V2 has cleaner edge map architecture

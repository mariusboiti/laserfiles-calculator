# Jigsaw Maker V3 - Classic Knobs Implementation

## Overview

V3 replaces the previous "grid + circles" knob geometry with production-ready **classic jigsaw knobs** featuring proper neck + bulb shapes, smooth cubic Bezier curves, and deterministic edge matching.

## Key Improvements

### ✅ Classic Knob Geometry
- **Neck + Bulb Shape**: Authentic puzzle knob with narrow neck and rounded lobe
- **Smooth Beziers**: C1 continuity throughout, no sharp corners
- **8-Segment Construction**:
  1. Flat start
  2. Shoulder curve into neck (left)
  3. Neck curve to bulb (left)
  4. Bulb left arc (quarter circle)
  5. Bulb top arc (quarter circle)
  6. Bulb right arc (quarter circle)
  7. Neck curve back (right)
  8. Shoulder curve to baseline (right)
  9. Flat end

### ✅ Deterministic Shared Edges
- **Edge Cache System**: Each interior edge generated once
- **Perfect Matching**: Male/female pairs use identical geometry (reversed + inverted)
- **Seeded RNG**: Stable keys ensure same seed → same puzzle
- **No Mismatches**: Adjacent pieces share exact same edge

### ✅ Constrained Randomness
- **Jitter Clamping**: ±0.15*L maximum, respects flat margins
- **Knob Size Limits**: ≤ 0.22 * min(cellW, cellH)
- **Safe Bounds**: Knobs never touch corners or self-intersect
- **Auto-Reduction**: High jitter automatically reduced for small pieces

### ✅ Reduced Grid Look
- **Flat Ratio Control**: 0.06-0.18 (default 0.12)
- **Organic Appearance**: Shorter straight segments on interior edges
- **Border Preservation**: Outer border remains fully flat

### ✅ Clean Export
- **No Duplicate Edges**: Each interior edge exported once
- **Efficient SVG**: Outer border + horizontal edges + vertical edges
- **Laser-Safe**: stroke-only, 0.001mm hairline width
- **Proper ViewBox**: Exact width/height fit

## Architecture

### Core Files

```
jigsaw-maker/
├── core/
│   ├── edgeClassic.ts           # Classic knob geometry engine
│   ├── edgeCache.ts             # Deterministic shared edge cache
│   ├── puzzleGeneratorV3.ts     # V3 puzzle builder
│   └── puzzleGenerator.ts       # Router (V3 is default)
├── types/
│   └── jigsaw.ts                # Extended with V3 params
├── config/
│   └── defaults.ts              # V3 defaults
└── ui/
    └── JigsawMakerTool.tsx      # V3 Classic Knobs controls
```

### Edge Generation Algorithm

```typescript
// Knob geometry proportions (relative to min(cellW, cellH))
knobR = knobSize * 0.18 * minDim        // Bulb radius
neckW = 0.45 * knobR                    // Neck width
neckL = 0.35 * knobR                    // Neck length
shoulder = 0.60 * knobR                 // Shoulder transition
flat = flatRatio * L                    // Flat segments
bulbShift = jitter * 0.15 * L (clamped) // Knob center shift
```

### Edge Cache Keys

```typescript
// Horizontal edges (between rows)
"H:r:c" where r = row index, c = column index

// Vertical edges (between columns)
"V:r:c" where r = row index, c = column index

// Seeded RNG per edge
rng = mulberry32(hash(seed + edgeKey))
```

### Piece Path Construction

```typescript
// Each piece uses 4 edges from cache:
- Top: horizontal[row][col] (forward)
- Right: vertical[row][col+1] (forward, rotated 90°)
- Bottom: horizontal[row+1][col] (reversed + inverted)
- Left: vertical[row][col] (reversed + inverted, rotated 90°)
```

## UI Controls

### Classic Knobs V3 Section

1. **Knob Size** (0.40-0.90)
   - Default: 0.75
   - Kids mode: 0.90
   - Controls bulb radius

2. **Roundness** (0.60-1.00)
   - Default: 0.85
   - Kids mode: 1.00
   - Affects bulb circularity

3. **Jitter** (0-0.35)
   - Default: 0.18
   - Kids mode: 0
   - Randomness in knob position

4. **Flat Ratio** (0.06-0.18)
   - Default: 0.12
   - Kids mode: 0.15
   - Reduces grid look

### Mode Presets

**Classic Mode:**
```typescript
knobSize: 0.75
roundness: 0.85
jitter: 0.18
flatRatio: 0.12
```

**Kids Mode:**
```typescript
knobSize: 0.90
roundness: 1.00
jitter: 0
flatRatio: 0.15
```

## Export Format

### SVG Structure

```xml
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" version="1.1" 
     width="200mm" height="150mm" viewBox="0 0 200 150">
  <!-- Jigsaw Puzzle V3 - Classic Knobs -->
  <!-- Dimensions: 200mm × 150mm -->
  <!-- Grid: 4×5 = 20 pieces -->
  <!-- Seed: 12345 -->
  <g id="CUT_LINES" fill="none" stroke="black" stroke-width="0.001">
    <!-- Outer border (1 path) -->
    <path d="M 0 0 L 200 0 L 200 150 L 0 150 Z" />
    
    <!-- Interior horizontal edges (3 rows × 5 columns = 15 paths) -->
    <path d="M ... classic knob path ..." />
    ...
    
    <!-- Interior vertical edges (4 rows × 4 columns = 16 paths) -->
    <path d="M ... classic knob path ..." />
    ...
  </g>
</svg>
```

### Filename Format

`jigsaw-{rows}x{columns}-{mode}-{date}.svg`

Example: `jigsaw-4x5-classic-2025-12-25.svg`

## Validation & Warnings

### Auto-Generated Warnings

- ✓ "Pieces are very small; knobs may be fragile." (< 15mm)
- ✓ "Knob size reduced to prevent overlaps." (size clamped)
- ✓ "High jitter reduced to prevent overlaps." (jitter clamped)

### Safety Clamps

```typescript
// Knob radius
maxKnobR = 0.22 * min(cellW, cellH)
knobR = min(requestedKnobR, maxKnobR)

// Bulb shift
maxShift = min(0.15 * L, availableRange / 2)
bulbShift = clamp(randomShift * maxShift, minX, maxX)

// Safe margins
safeMargin = 0.12 * L
knobMustStayWithin = [flat + safeMargin, L - flat - safeMargin]
```

## Acceptance Tests

### Test Case: 200×150mm, 4×5 puzzle

**Expected Results:**
- ✅ Knobs look like classic puzzle knobs (neck + bulb)
- ✅ No overlapping knobs
- ✅ No chaotic edges
- ✅ Seams feel organic (reduced grid look)
- ✅ Same seed reproduces identical puzzle
- ✅ SVG opens in LightBurn and cuts cleanly

**Test Commands:**
```typescript
// Generate puzzle
const inputs = {
  widthMm: 200,
  heightMm: 150,
  rows: 4,
  columns: 5,
  knobSize: 0.75,
  roundness: 0.85,
  jitter: 0.18,
  flatRatio: 0.12,
  randomSeed: 12345,
};

const result = await generatePuzzleV3(inputs);

// Verify determinism
const result2 = await generatePuzzleV3(inputs);
assert(result.fullSvg === result2.fullSvg);

// Verify no duplicates
const edgeCount = (result.fullSvg.match(/<path/g) || []).length;
const expectedEdges = 1 + (rows-1)*columns + rows*(columns-1);
assert(edgeCount === expectedEdges);
```

## Performance

- **Edge Generation**: O(rows × columns)
- **Cache Lookup**: O(1) per edge
- **No Boolean Ops**: Pure SVG path generation
- **Typical 4×5**: < 50ms generation time

## Migration from V2

### Automatic (Default)
V3 is now the default generator. Existing puzzles will automatically use V3 on next generation.

### Manual Override
To use PathOps Pro instead:
1. Expand "PathOps Pro ⚡" section
2. Enable "Use PathOps Engine (WASM)"

### Parameter Mapping
V2 → V3:
- `knobStyle` → ignored (V3 always uses classic)
- `cornerRadius` → ignored (V3 uses flatRatio)
- `kerfOffset` → still supported
- `randomSeed` → same behavior

## Troubleshooting

### Issue: Knobs look too small
**Solution**: Increase Knob Size slider (0.75 → 0.85)

### Issue: Edges look too straight
**Solution**: Decrease Flat Ratio slider (0.12 → 0.08)

### Issue: Knobs overlap at corners
**Solution**: Decrease Jitter slider (0.18 → 0.10)

### Issue: Puzzle not deterministic
**Solution**: Verify same seed is used. Check browser console for "Using V3 Classic Knobs generator" message.

## Technical Details

### Bezier Control Points

Classic knob uses carefully calculated control points for smooth C1 continuity:

```typescript
// Shoulder entry (left)
shoulderCtrl1 = (flatStart + 0.6*(shoulderStart - flatStart), 0)
shoulderCtrl2 = (neckBaseLeft - 0.4*shoulder, 0.5*neckBaseLeftY)

// Neck to bulb (left)
neckCtrl1 = (neckBaseLeft, 0.6*neckDepth)
neckCtrl2 = (bulbLeft - 0.2*knobR, bulbLeftY - 0.15*knobR)

// Bulb arcs (circle approximation)
k = 0.5523 // Bezier magic number
bulbCtrl = centerY ± k*radius
```

### Coordinate Systems

- **Local Edge Space**: (0,0) to (L,0) horizontal
- **Sheet Space**: Translated by (marginMm + col*cellW, marginMm + row*cellH)
- **Vertical Edges**: Generated horizontally, then rotated 90°

### Path Transformations

```typescript
// Reverse path (swap endpoints)
reverseEdgeD(d, L) → path from (L,0) to (0,0)

// Invert path (flip across y=0)
invertEdge(d) → y coordinates negated

// Rotate vertical edge
transformVerticalEdge(d, offsetX, length, 'down'|'up')
```

## Future Enhancements

- [ ] Preview with hover highlight (show individual pieces)
- [ ] Debug mode (show edge keys, constraints)
- [ ] Export individual pieces with spacing
- [ ] Photo mode integration
- [ ] Custom knob profiles (beyond classic)
- [ ] Asymmetric knobs (different sizes per edge)

## Credits

- **V3 Implementation**: Classic knob geometry with Bezier curves
- **Algorithm**: Deterministic shared edge cache
- **Inspiration**: Ravensburger puzzle knobs
- **RNG**: Mulberry32 (Tommy Ettinger)

---

**Status**: ✅ Production Ready  
**Version**: 3.0  
**Date**: 2025-12-25  
**Branch**: `fix/jigsaw-v3-classic-knobs`

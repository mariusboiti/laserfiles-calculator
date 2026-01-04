# BoxMaker Geometry Fix Notes

## Bottom Panel Analysis

### Current Implementation (Hinged Box)

**Function**: `buildBottomOutlineExpandedX(w, d, t, fingerW)`

**Current Logic**:
```typescript
const leftX = -t;
const rightX = w + t;
// Bottom extends beyond outer dimensions by thickness
```

**Issue**: Bottom panel uses OUTER dimensions (W, D) but should use INNER dimensions.

### Correct Approach

For a finger-jointed box where panels interlock:

**Outer dimensions** (user input):
- W = outer width
- D = outer depth  
- H = outer height

**Inner dimensions** (actual box interior):
- innerW = W - 2*t (left and right panels take thickness)
- innerD = D - 2*t (front and back panels take thickness)
- innerH = H - t (bottom panel takes thickness)

**Bottom panel should be**:
- Width: innerW = W - 2*t
- Depth: innerD = D - 2*t
- With finger joints that complement the side panels

### Finger Joint Complementarity

**Critical Rule**: Mating edges must have complementary patterns.

Example:
- Front panel bottom edge: starts with TAB (finger out)
- Bottom panel front edge: starts with SLOT (finger in)
- Same segment widths, opposite kinds

**Current code uses**: `buildJointEdgeSegments` which generates patterns but may not guarantee complementarity across different panels.

**Solution**: Use canonical `fingerPattern.ts` builder:
```typescript
// Build base pattern once
const pattern = buildFingerPattern({
  length: innerW,
  fingerWidth: fingerW,
  startWith: 'finger',
});

// Front bottom edge uses pattern as-is (tabs out)
const frontBottomEdge = buildEdgePathHorizontalBottom(pattern, ...);

// Bottom front edge uses complementary (slots in)
const complementary = getComplementaryPattern(pattern);
const bottomFrontEdge = buildEdgePathHorizontalTop(complementary, ...);
```

## Sliding Drawer Analysis

### Current Implementation

Need to verify:
1. Outer box inner dimensions calculated correctly
2. Drawer dimensions = inner - 2*clearance
3. Opening dimensions match drawer dimensions
4. Front face lip extends correctly

### Verification Needed

Check `core/sliding/drawerMath.ts` and `generateSlidingDrawerSvgs.ts`:
- `computeDrawerDimensions()` formulas
- Opening width/height calculations
- Drawer panel dimensions

## Action Plan

### Phase 1: Bottom Panel Fix (Hinged)
1. Modify `buildBottomOutlineExpandedX` to use inner dimensions
2. Ensure finger patterns complement side panels
3. Test with Small/Medium/Large presets

### Phase 2: Verify Complementarity (All Modes)
1. Audit all `buildJointEdgeSegments` calls
2. Replace with canonical `fingerPattern.ts` where possible
3. Ensure left/right panels identical
4. Ensure front/back panels identical

### Phase 3: Sliding Drawer Verification
1. Verify drawer dimension formulas
2. Test opening fits drawer
3. Test clearance calculations

## Testing Checklist

- [ ] Hinged box bottom fits without gaps
- [ ] Left and right panels are identical
- [ ] Front and back panels are identical  
- [ ] Finger joints interlock properly
- [ ] No floating corners
- [ ] Drawer slides smoothly with clearance
- [ ] Opening matches drawer dimensions

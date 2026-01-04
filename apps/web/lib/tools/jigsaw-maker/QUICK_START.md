# Jigsaw Maker - Quick Start Guide

## Installation Complete ✅

The PathOps Boolean Engine is ready to use. All core components are implemented.

## Basic Usage

### 1. Import the Generator

```typescript
import { generateJigsaw, DEFAULT_SETTINGS } from '@/lib/tools/jigsaw-maker/core';
```

### 2. Configure Settings

```typescript
const settings = {
  ...DEFAULT_SETTINGS,
  
  // Puzzle dimensions
  widthMm: 200,
  heightMm: 150,
  rows: 4,
  columns: 5,
  
  // Randomness
  randomSeed: 12345,
  
  // Kerf & Clearance
  kerfMm: 0.15,        // Laser kerf compensation
  clearanceMm: 0.0,    // Fit adjustment (0 = normal)
  
  // Layout
  layoutMode: 'assembled',  // or 'packed'
  
  // Optional features
  pieceNumbering: true,
  includeBacking: false,
};
```

### 3. Generate Puzzle

```typescript
const result = await generateJigsaw(settings);

console.log('Generated puzzle:', {
  pieces: result.pieces.length,
  warnings: result.warnings,
  time: result.diagnostics.generationTimeMs + 'ms'
});
```

### 4. Use the SVG

```typescript
// Full SVG document
const svgDocument = result.svg;

// Cut layer only
const cutLayer = result.cutLayerSvg;

// Piece information
result.pieces.forEach(piece => {
  console.log(`${piece.id}: row=${piece.row}, col=${piece.col}`);
});
```

## Common Configurations

### Standard Puzzle (Assembled)
```typescript
{
  widthMm: 200,
  heightMm: 150,
  rows: 4,
  columns: 5,
  kerfMm: 0.15,
  clearanceMm: 0.0,
  layoutMode: 'assembled',
  pieceNumbering: false,
}
```

### Production Run (Packed on Sheet)
```typescript
{
  widthMm: 200,
  heightMm: 150,
  rows: 4,
  columns: 5,
  kerfMm: 0.15,
  clearanceMm: 0.0,
  layoutMode: 'packed',
  sheetPreset: 'glowforge-basic',
  marginMm: 10,
  gapMm: 5,
  pieceNumbering: true,
}
```

### Tight Fit Puzzle
```typescript
{
  widthMm: 200,
  heightMm: 150,
  rows: 4,
  columns: 5,
  kerfMm: 0.15,
  clearanceMm: -0.05,  // Negative = tighter fit
  layoutMode: 'assembled',
}
```

### Loose Fit Puzzle
```typescript
{
  widthMm: 200,
  heightMm: 150,
  rows: 4,
  columns: 5,
  kerfMm: 0.15,
  clearanceMm: 0.05,   // Positive = looser fit
  layoutMode: 'assembled',
}
```

## Understanding Kerf & Clearance

```
finalOffset = (kerfMm / 2) - clearanceMm

Examples:
┌─────────────┬────────────┬───────────┬──────────────┐
│ Kerf (mm)   │ Clear (mm) │ Offset    │ Result       │
├─────────────┼────────────┼───────────┼──────────────┤
│ 0.15        │ 0.0        │ +0.075mm  │ Normal fit   │
│ 0.15        │ 0.05       │ +0.025mm  │ Looser fit   │
│ 0.15        │ -0.05      │ +0.125mm  │ Tighter fit  │
│ 0.20        │ 0.0        │ +0.100mm  │ Thick kerf   │
└─────────────┴────────────┴───────────┴──────────────┘
```

## Output Structure

```typescript
interface JigsawOutput {
  svg: string;              // Complete SVG document
  cutLayerSvg: string;      // Cut layer only
  engraveLayerSvg?: string; // Engrave layer (if numbering enabled)
  pieces: PieceInfo[];      // Array of piece information
  warnings: string[];       // Validation warnings
  diagnostics: {
    pieceCount: number;
    pathCount: number;
    offsetDelta: number;
    edgeCount: {
      vertical: number;
      horizontal: number;
      total: number;
    };
    layoutFits: boolean;
    generationTimeMs: number;
  };
}
```

## Piece Information

```typescript
interface PieceInfo {
  row: number;              // Grid row (0-indexed)
  col: number;              // Grid column (0-indexed)
  id: string;               // Human-readable ID (A1, A2, B1...)
  path: string;             // SVG path string
  originalPath: string;     // Path before offset
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  position: {               // Position after layout
    x: number;
    y: number;
  };
}
```

## Export to File

```typescript
// Browser download
function downloadSVG(svg: string, filename: string) {
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Usage
const result = await generateJigsaw(settings);
downloadSVG(result.svg, 'puzzle-4x5.svg');
```

## Error Handling

```typescript
try {
  const result = await generateJigsaw(settings);
  
  // Check warnings
  if (result.warnings.length > 0) {
    console.warn('Warnings:', result.warnings);
  }
  
  // Check layout fit
  if (!result.diagnostics.layoutFits) {
    console.error('Puzzle does not fit in selected sheet!');
  }
  
} catch (error) {
  console.error('Generation failed:', error);
}
```

## Performance Tips

1. **First Load**: PathOps WASM loads once (~500ms). Subsequent generations are fast.

2. **Large Puzzles**: For puzzles >100 pieces, expect longer generation times.

3. **Caching**: Same settings → same output. Cache results if needed.

4. **Memory**: PathOps objects are cleaned up automatically.

## Validation

The engine validates settings automatically:

```typescript
// These will generate warnings:
- Pieces too small (<15mm)
- High kerf offset (>0.5mm)
- Puzzle doesn't fit in sheet (packed mode)
- Very large puzzles (>100 pieces)

// These will throw errors:
- Invalid dimensions (width/height out of range)
- Invalid grid (rows/columns out of range)
- Negative kerf
```

## Debugging

Enable diagnostics to see generation details:

```typescript
const result = await generateJigsaw(settings);

console.log('Diagnostics:', {
  pieces: result.diagnostics.pieceCount,
  seams: result.diagnostics.edgeCount.total,
  offset: result.diagnostics.offsetDelta,
  time: result.diagnostics.generationTimeMs,
  fits: result.diagnostics.layoutFits,
});
```

## Next Steps

1. **Test Generation**: Try generating a simple 2×2 puzzle first
2. **Verify Output**: Open SVG in browser or vector editor
3. **Test in LightBurn**: Import SVG and check for duplicates
4. **Adjust Settings**: Fine-tune kerf/clearance for your laser
5. **Production**: Generate larger puzzles with packed layout

## Support

For issues or questions:
- Check `FINAL_IMPLEMENTATION.md` for architecture details
- Review `PATHOPS_ONLY_ENGINE.md` for technical details
- See test files in `core/__tests__/` for examples

---

**Engine**: PathOps Boolean v1.0  
**Status**: Production Ready ✅  
**Last Updated**: December 25, 2025

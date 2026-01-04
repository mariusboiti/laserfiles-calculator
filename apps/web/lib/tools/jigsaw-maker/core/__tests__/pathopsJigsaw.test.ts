/**
 * PathOps Jigsaw Generator Tests
 * Verify deterministic generation and basic functionality
 */

import { generateJigsawPathOps, generateJigsawFilename, type JigsawPathOpsParams } from '../pathopsPuzzleGenerator';

describe('PathOps Jigsaw Generator', () => {
  const baseParams: JigsawPathOpsParams = {
    widthMm: 200,
    heightMm: 150,
    rows: 3,
    columns: 4,
    marginMm: 5,
    knobSizePct: 65,
    roundness: 0.85,
    jitter: 0.15,
    seed: 12345,
    kerfMm: 0.15,
    clearanceMm: 0,
    exportMode: 'cut-lines',
    compensateKerf: false,
  };

  test('generates valid SVG output', async () => {
    const result = await generateJigsawPathOps(baseParams);
    
    expect(result.cutLinesSvg).toBeTruthy();
    expect(result.cutLinesSvg).toContain('<?xml version="1.0"');
    expect(result.cutLinesSvg).toContain('<svg');
    expect(result.cutLinesSvg).toContain('</svg>');
    expect(result.cutLinesSvg).toContain('CUT_LINES');
  });

  test('is deterministic with same seed', async () => {
    const result1 = await generateJigsawPathOps(baseParams);
    const result2 = await generateJigsawPathOps(baseParams);
    
    expect(result1.cutLinesSvg).toBe(result2.cutLinesSvg);
  });

  test('produces different output with different seed', async () => {
    const result1 = await generateJigsawPathOps(baseParams);
    const result2 = await generateJigsawPathOps({ ...baseParams, seed: 54321 });
    
    expect(result1.cutLinesSvg).not.toBe(result2.cutLinesSvg);
  });

  test('generates correct filename', () => {
    const filename = generateJigsawFilename(baseParams);
    
    expect(filename).toContain('jigsaw-4x3');
    expect(filename).toContain('200x150mm');
    expect(filename).toContain('seed12345');
    expect(filename).toEndWith('.svg');
  });

  test('includes correct number of pieces in output', async () => {
    const result = await generateJigsawPathOps(baseParams);
    const expectedPieces = baseParams.rows * baseParams.columns;
    
    expect(result.cutLinesSvg).toContain(`Pieces: ${baseParams.rows}×${baseParams.columns} = ${expectedPieces}`);
  });

  test('respects margin parameter', async () => {
    const withMargin = await generateJigsawPathOps({ ...baseParams, marginMm: 10 });
    const noMargin = await generateJigsawPathOps({ ...baseParams, marginMm: 0 });
    
    expect(withMargin.cutLinesSvg).not.toBe(noMargin.cutLinesSvg);
  });

  test('handles different knob parameters', async () => {
    const smallKnobs = await generateJigsawPathOps({ ...baseParams, knobSizePct: 40 });
    const largeKnobs = await generateJigsawPathOps({ ...baseParams, knobSizePct: 90 });
    
    expect(smallKnobs.cutLinesSvg).not.toBe(largeKnobs.cutLinesSvg);
  });

  test('validates minimum piece size', async () => {
    const result = await generateJigsawPathOps({
      ...baseParams,
      widthMm: 50,
      heightMm: 50,
      rows: 10,
      columns: 10,
    });
    
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('very small');
  });
});

/**
 * PathOps Engine Tests
 * Basic tests to verify the engine works correctly
 */

import { generateJigsaw, DEFAULT_SETTINGS } from '../index';

describe('PathOps Jigsaw Engine', () => {
  it('should generate a basic 2x2 puzzle', async () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      widthMm: 100,
      heightMm: 100,
      rows: 2,
      columns: 2,
      randomSeed: 12345,
    };
    
    const result = await generateJigsaw(settings);
    
    expect(result.pieces.length).toBe(4);
    expect(result.svg).toContain('CUT_PIECES');
    expect(result.diagnostics.pieceCount).toBe(4);
    expect(result.diagnostics.edgeCount.total).toBe(4); // 2 vertical + 2 horizontal seams
  });
  
  it('should generate deterministic output', async () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      widthMm: 150,
      heightMm: 100,
      rows: 3,
      columns: 4,
      randomSeed: 99999,
    };
    
    const result1 = await generateJigsaw(settings);
    const result2 = await generateJigsaw(settings);
    
    // Same seed should produce identical SVG
    expect(result1.svg).toBe(result2.svg);
    expect(result1.pieces.length).toBe(result2.pieces.length);
  });
  
  it('should apply kerf and clearance correctly', async () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      widthMm: 100,
      heightMm: 100,
      rows: 2,
      columns: 2,
      kerfMm: 0.2,
      clearanceMm: 0.05,
    };
    
    const result = await generateJigsaw(settings);
    
    const expectedOffset = (0.2 / 2) - 0.05; // 0.05mm
    expect(result.diagnostics.offsetDelta).toBeCloseTo(expectedOffset, 3);
  });
  
  it('should handle packed layout', async () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      widthMm: 200,
      heightMm: 150,
      rows: 4,
      columns: 5,
      layoutMode: 'packed' as const,
      sheetPreset: 'glowforge-basic' as const,
      marginMm: 10,
      gapMm: 5,
    };
    
    const result = await generateJigsaw(settings);
    
    expect(result.pieces.length).toBe(20);
    expect(result.diagnostics.layoutFits).toBeDefined();
  });
  
  it('should generate piece IDs correctly', async () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      widthMm: 100,
      heightMm: 100,
      rows: 3,
      columns: 3,
    };
    
    const result = await generateJigsaw(settings);
    
    const ids = result.pieces.map(p => p.id);
    expect(ids).toContain('A1');
    expect(ids).toContain('A3');
    expect(ids).toContain('C1');
    expect(ids).toContain('C3');
  });
});

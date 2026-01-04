/**
 * Deterministic Shared Edge Cache V3
 * 
 * Each interior edge is generated ONCE and reused by both adjacent pieces.
 * Uses seeded RNG with stable keys to ensure deterministic output.
 * 
 * Rules:
 * - Horizontal edges: between row r and r+1 at column c => key "H:r:c"
 * - Vertical edges: between col c and c+1 at row r => key "V:r:c"
 * - Each edge stores: sign, bulbShift, knobR, and path segment
 * - Neighbors reuse the same edge with transformations (reverse + invert)
 */

import { createSeededRandom } from './random';
import type { EdgeParams, EdgeShape } from './edgeClassic';
import {
  generateEdgeShape,
  generateStraightEdge,
  reverseEdgeD,
  invertEdge,
} from './edgeClassic';

export type EdgeKey = string; // "H:r:c" or "V:r:c"

export interface CachedEdge {
  key: EdgeKey;
  shape: EdgeShape;
  isBorder: boolean;
}

export class EdgeCache {
  private cache = new Map<EdgeKey, CachedEdge>();
  private params: EdgeParams;
  private rows: number;
  private columns: number;
  private cellW: number;
  private cellH: number;
  
  constructor(
    rows: number,
    columns: number,
    cellW: number,
    cellH: number,
    params: EdgeParams
  ) {
    this.rows = rows;
    this.columns = columns;
    this.cellW = cellW;
    this.cellH = cellH;
    this.params = params;
    
    this.generateAllEdges();
  }
  
  /**
   * Generate all edges once during initialization
   */
  private generateAllEdges(): void {
    const minDim = Math.min(this.cellW, this.cellH);
    
    // Generate horizontal edges (between rows)
    for (let r = 0; r <= this.rows; r++) {
      for (let c = 0; c < this.columns; c++) {
        const key = this.makeHorizontalKey(r, c);
        const isBorder = r === 0 || r === this.rows;
        
        if (isBorder) {
          // Border edge: straight line
          this.cache.set(key, {
            key,
            shape: {
              d: generateStraightEdge(this.cellW),
              L: this.cellW,
              sign: 1,
              bulbShift: 0,
              knobR: 0,
            },
            isBorder: true,
          });
        } else {
          // Interior edge: classic knob
          const rng = this.getRngForEdge(key);
          const sign = rng() > 0.5 ? 1 : -1;
          const randomShift = (rng() - 0.5) * 2; // -1..1
          
          const shape = generateEdgeShape(
            this.cellW,
            minDim,
            sign as 1 | -1,
            this.params,
            randomShift
          );
          
          this.cache.set(key, {
            key,
            shape,
            isBorder: false,
          });
        }
      }
    }
    
    // Generate vertical edges (between columns)
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c <= this.columns; c++) {
        const key = this.makeVerticalKey(r, c);
        const isBorder = c === 0 || c === this.columns;
        
        if (isBorder) {
          // Border edge: straight line
          this.cache.set(key, {
            key,
            shape: {
              d: generateStraightEdge(this.cellH),
              L: this.cellH,
              sign: 1,
              bulbShift: 0,
              knobR: 0,
            },
            isBorder: true,
          });
        } else {
          // Interior edge: classic knob
          const rng = this.getRngForEdge(key);
          const sign = rng() > 0.5 ? 1 : -1;
          const randomShift = (rng() - 0.5) * 2; // -1..1
          
          const shape = generateEdgeShape(
            this.cellH,
            minDim,
            sign as 1 | -1,
            this.params,
            randomShift
          );
          
          this.cache.set(key, {
            key,
            shape,
            isBorder: false,
          });
        }
      }
    }
  }
  
  /**
   * Get seeded RNG for a specific edge
   */
  private getRngForEdge(edgeKey: string): () => number {
    const hash = this.hashString(this.params.seed + ':' + edgeKey);
    return createSeededRandom(hash);
  }
  
  /**
   * Simple string hash
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
  
  /**
   * Make horizontal edge key
   */
  private makeHorizontalKey(row: number, col: number): EdgeKey {
    return `H:${row}:${col}`;
  }
  
  /**
   * Make vertical edge key
   */
  private makeVerticalKey(row: number, col: number): EdgeKey {
    return `V:${row}:${col}`;
  }
  
  /**
   * Get edge for a piece's top side
   */
  getTopEdge(row: number, col: number): CachedEdge {
    const key = this.makeHorizontalKey(row, col);
    return this.cache.get(key)!;
  }
  
  /**
   * Get edge for a piece's bottom side (reversed + inverted)
   */
  getBottomEdge(row: number, col: number): CachedEdge {
    const key = this.makeHorizontalKey(row + 1, col);
    const original = this.cache.get(key)!;
    
    if (original.isBorder) {
      return original;
    }
    
    // For bottom edge, we need the same geometry but reversed and inverted
    return {
      ...original,
      shape: {
        ...original.shape,
        d: invertEdge(reverseEdgeD(original.shape.d, original.shape.L)),
        sign: (original.shape.sign * -1) as 1 | -1,
      },
    };
  }
  
  /**
   * Get edge for a piece's left side
   */
  getLeftEdge(row: number, col: number): CachedEdge {
    const key = this.makeVerticalKey(row, col);
    return this.cache.get(key)!;
  }
  
  /**
   * Get edge for a piece's right side (reversed + inverted)
   */
  getRightEdge(row: number, col: number): CachedEdge {
    const key = this.makeVerticalKey(row, col + 1);
    const original = this.cache.get(key)!;
    
    if (original.isBorder) {
      return original;
    }
    
    // For right edge, we need the same geometry but reversed and inverted
    return {
      ...original,
      shape: {
        ...original.shape,
        d: invertEdge(reverseEdgeD(original.shape.d, original.shape.L)),
        sign: (original.shape.sign * -1) as 1 | -1,
      },
    };
  }
  
  /**
   * Get all unique interior horizontal edges (for export)
   */
  getUniqueHorizontalInteriorEdges(): Array<{ row: number; col: number; edge: CachedEdge }> {
    const edges: Array<{ row: number; col: number; edge: CachedEdge }> = [];
    
    for (let r = 1; r < this.rows; r++) {
      for (let c = 0; c < this.columns; c++) {
        const edge = this.cache.get(this.makeHorizontalKey(r, c))!;
        if (!edge.isBorder) {
          edges.push({ row: r, col: c, edge });
        }
      }
    }
    
    return edges;
  }
  
  /**
   * Get all unique interior vertical edges (for export)
   */
  getUniqueVerticalInteriorEdges(): Array<{ row: number; col: number; edge: CachedEdge }> {
    const edges: Array<{ row: number; col: number; edge: CachedEdge }> = [];
    
    for (let r = 0; r < this.rows; r++) {
      for (let c = 1; c < this.columns; c++) {
        const edge = this.cache.get(this.makeVerticalKey(r, c))!;
        if (!edge.isBorder) {
          edges.push({ row: r, col: c, edge });
        }
      }
    }
    
    return edges;
  }
  
  /**
   * Get warnings about edge constraints
   */
  getWarnings(): string[] {
    const warnings: string[] = [];
    const minDim = Math.min(this.cellW, this.cellH);
    
    // Check if pieces are very small
    if (minDim < 15) {
      warnings.push('Pieces are very small; knobs may be fragile.');
    }
    
    // Check if jitter was reduced
    const maxKnobR = 0.22 * minDim;
    const requestedKnobR = this.params.knobSize * 0.18 * minDim;
    if (requestedKnobR > maxKnobR) {
      warnings.push('Knob size reduced to prevent overlaps.');
    }
    
    // Check if jitter is too high for small pieces
    if (this.params.jitter > 0.25 && minDim < 25) {
      warnings.push('High jitter reduced to prevent overlaps.');
    }
    
    return warnings;
  }
}

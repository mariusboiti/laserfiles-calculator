/**
 * Debug point 40 issue
 */

import { buildSimpleBox } from './simpleBox';

console.log('🔍 Debugging point 40 issue...\n');

const inputs = {
  innerWidth: 100,
  innerDepth: 80,
  innerHeight: 60,
  thickness: 3,
  fingerWidth: 10
};

const panels = buildSimpleBox(inputs);
const frontPanel = panels.front;

console.log(`Front panel has ${frontPanel.length} vertices`);

// Check around point 40
const startIdx = Math.max(0, 40 - 3);
const endIdx = Math.min(frontPanel.length, 40 + 4);

console.log(`\nVertices around point 40:`);
for (let i = startIdx; i < endIdx; i++) {
  const p = frontPanel[i];
  console.log(`  ${i}: (${p.x.toFixed(3)}, ${p.y.toFixed(3)})`);
}

// Check segments around point 40
console.log(`\nSegments around point 40:`);
for (let i = Math.max(1, 40 - 2); i <= Math.min(40, frontPanel.length - 1); i++) {
  const prev = frontPanel[i - 1];
  const curr = frontPanel[i];
  
  const dx = curr.x - prev.x;
  const dy = curr.y - prev.y;
  
  const isHorizontal = Math.abs(dy) < 0.001;
  const isVertical = Math.abs(dx) < 0.001;
  
  console.log(`  Segment ${i-1}->${i}: dx=${dx.toFixed(3)}, dy=${dy.toFixed(3)} ${isHorizontal ? 'H' : isVertical ? 'V' : '❌ NON-ORTHOGONAL'}`);
  
  if (!isHorizontal && !isVertical) {
    console.error(`    ❌ THIS IS THE PROBLEMATIC SEGMENT!`);
    console.error(`    From: (${prev.x.toFixed(3)}, ${prev.y.toFixed(3)})`);
    console.error(`    To:   (${curr.x.toFixed(3)}, ${curr.y.toFixed(3)})`);
  }
}

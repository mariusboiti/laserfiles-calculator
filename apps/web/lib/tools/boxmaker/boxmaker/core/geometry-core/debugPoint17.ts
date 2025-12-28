/**
 * Debug specific point 17 issue
 */

import { buildSimpleBox } from './simpleBox';

console.log('🔍 Debugging point 17 issue...\n');

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

// Check around point 17
const startIdx = Math.max(0, 17 - 3);
const endIdx = Math.min(frontPanel.length, 17 + 4);

console.log(`\nVertices around point 17:`);
for (let i = startIdx; i < endIdx; i++) {
  const p = frontPanel[i];
  console.log(`  ${i}: (${p.x.toFixed(3)}, ${p.y.toFixed(3)})`);
}

// Check segments around point 17
console.log(`\nSegments around point 17:`);
for (let i = Math.max(1, 17 - 2); i <= Math.min(17, frontPanel.length - 1); i++) {
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

// Check if this is a transition between edges
console.log(`\nChecking if point 17 is an edge transition:`);
if (17 > 0 && 17 < frontPanel.length - 1) {
  const prev = frontPanel[17 - 1];
  const curr = frontPanel[17];
  const next = frontPanel[17 + 1];
  
  console.log(`  Previous: (${prev.x.toFixed(1)}, ${prev.y.toFixed(1)})`);
  console.log(`  Current:  (${curr.x.toFixed(1)}, ${curr.y.toFixed(1)})`);
  console.log(`  Next:     (${next.x.toFixed(1)}, ${next.y.toFixed(1)})`);
  
  // Check if we're transitioning from one edge to another
  const dx1 = curr.x - prev.x;
  const dy1 = curr.y - prev.y;
  const dx2 = next.x - curr.x;
  const dy2 = next.y - curr.y;
  
  const dir1 = Math.abs(dx1) > 0.001 ? 'H' : 'V';
  const dir2 = Math.abs(dx2) > 0.001 ? 'H' : 'V';
  
  console.log(`  Direction before: ${dir1}, after: ${dir2}`);
  
  if (dir1 !== dir2) {
    console.log(`  ✅ This is a corner transition (direction change)`);
  }
}

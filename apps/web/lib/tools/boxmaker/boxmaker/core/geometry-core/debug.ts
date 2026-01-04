/**
 * Debug Edge Generator
 */

import { generateEdge, rotate90, translate } from './edgeGenerator';

// Test edge generation
console.log('🔍 Debugging edge generation...\n');

// Generate a simple finger edge
const edge = generateEdge(
  100,  // length
  3,    // thickness  
  10,   // fingerWidth
  'fingers-out', // mode
  true  // startWithTab
);

console.log('Original edge (horizontal):');
edge.forEach((p, i) => {
  console.log(`  ${i}: (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`);
});

// Rotate 90 degrees
const rotated = rotate90(edge);
console.log('\nRotated edge (vertical):');
rotated.forEach((p, i) => {
  console.log(`  ${i}: (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`);
});

// Check for orthogonal segments
console.log('\nChecking orthogonal segments...');
for (let i = 1; i < rotated.length; i++) {
  const prev = rotated[i - 1];
  const curr = rotated[i];
  
  const dx = curr.x - prev.x;
  const dy = curr.y - prev.y;
  
  const isHorizontal = Math.abs(dy) < 0.001;
  const isVertical = Math.abs(dx) < 0.001;
  
  console.log(`  Segment ${i-1}->${i}: dx=${dx.toFixed(1)}, dy=${dy.toFixed(1)} ${isHorizontal ? 'H' : isVertical ? 'V' : 'DIAGONAL'}`);
  
  if (!isHorizontal && !isVertical) {
    console.error(`    ❌ NON-ORTHOGONAL SEGMENT DETECTED!`);
  }
}

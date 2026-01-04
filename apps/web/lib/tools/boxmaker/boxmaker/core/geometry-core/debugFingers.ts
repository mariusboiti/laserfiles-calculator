/**
 * Debug Finger Joints on Vertical Edge
 */

import { generateEdge, rotate90 } from './edgeGenerator';

console.log('🔍 Debugging finger joints on vertical edge...\n');

// Generate vertical finger edge
const horizontalEdge = generateEdge(
  60,   // length
  3,    // thickness
  10,   // fingerWidth
  'fingers-out', // mode
  true  // startWithTab
);

console.log('HORIZONTAL edge (first 10 points):');
horizontalEdge.slice(0, 10).forEach((p, i) => {
  console.log(`  ${i}: (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`);
});

// Rotate to vertical
const verticalEdge = rotate90(horizontalEdge);

console.log('\nVERTICAL edge (first 10 points):');
verticalEdge.slice(0, 10).forEach((p, i) => {
  console.log(`  ${i}: (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`);
});

// Check finger pattern
console.log('\nChecking finger pattern on vertical edge:');
let fingerCount = 0;
let gapCount = 0;

for (let i = 1; i < Math.min(20, verticalEdge.length); i++) {
  const prev = verticalEdge[i - 1];
  const curr = verticalEdge[i];
  
  const dx = curr.x - prev.x;
  const dy = curr.y - prev.y;
  
  if (Math.abs(dx) > 0.001) {
    // Horizontal movement (finger protrusion)
    console.log(`  Point ${i}: Finger protrusion dx=${dx.toFixed(1)}`);
    fingerCount++;
  } else if (Math.abs(dy) > 0.001) {
    // Vertical movement (along edge)
    console.log(`  Point ${i}: Vertical movement dy=${dy.toFixed(1)}`);
    if (i > 1) {
      const prev2 = verticalEdge[i - 2];
      const dx2 = prev.x - prev2.x;
      if (Math.abs(dx2) < 0.001) {
        gapCount++;
      }
    }
  }
}

console.log(`\nSummary: ${fingerCount} fingers, ${gapCount} gaps`);

// Check if pattern is correct (should alternate)
console.log('\nPattern should be: finger-gap-finger-gap...');
let expectedFinger = true;
let patternCorrect = true;

for (let i = 1; i < Math.min(10, verticalEdge.length); i++) {
  const prev = verticalEdge[i - 1];
  const curr = verticalEdge[i];
  
  const dx = curr.x - prev.x;
  const isFinger = Math.abs(dx) > 0.001;
  
  if (i === 1) {
    // First segment should be finger
    if (!isFinger) {
      console.error(`  ❌ Should start with finger, starts with gap`);
      patternCorrect = false;
    }
  }
}

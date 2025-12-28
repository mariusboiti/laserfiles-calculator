/**
 * Debug Panel Construction
 */

import { buildPanel } from './edgeGenerator';

// Test panel construction
console.log('🔍 Debugging panel construction...\n');

const spec = {
  width: 106, // 100 + 2*3
  height: 60,
  thickness: 3,
  fingerWidth: 10,
  topMode: 'flat' as const,
  rightMode: 'fingers-out' as const,
  bottomMode: 'fingers-out' as const,
  leftMode: 'fingers-out' as const
};

console.log('Building FRONT panel...');
const panel = buildPanel(spec);

console.log(`Panel has ${panel.length} vertices`);
console.log('First few vertices:');
panel.slice(0, 10).forEach((p, i) => {
  console.log(`  ${i}: (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`);
});

console.log('\nLast few vertices:');
panel.slice(-10).forEach((p, i) => {
  const idx = panel.length - 10 + i;
  console.log(`  ${idx}: (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`);
});

// Check if closed
const first = panel[0];
const last = panel[panel.length - 1];
console.log(`\nClosed check:`);
console.log(`  First: (${first.x.toFixed(3)}, ${first.y.toFixed(3)})`);
console.log(`  Last:  (${last.x.toFixed(3)}, ${last.y.toFixed(3)})`);
console.log(`  Diff:  (${Math.abs(first.x - last.x).toFixed(3)}, ${Math.abs(first.y - last.y).toFixed(3)})`);

// Check orthogonal segments
console.log('\nOrthogonal check:');
let nonOrthogonalCount = 0;
for (let i = 1; i < panel.length; i++) {
  const prev = panel[i - 1];
  const curr = panel[i];
  
  const dx = curr.x - prev.x;
  const dy = curr.y - prev.y;
  
  const isHorizontal = Math.abs(dy) < 0.001;
  const isVertical = Math.abs(dx) < 0.001;
  
  if (!isHorizontal && !isVertical) {
    console.error(`  ❌ Segment ${i-1}->${i}: dx=${dx.toFixed(3)}, dy=${dy.toFixed(3)} NON-ORTHOGONAL`);
    nonOrthogonalCount++;
  }
}

if (nonOrthogonalCount === 0) {
  console.log('  ✅ All segments are orthogonal');
} else {
  console.log(`  ❌ ${nonOrthogonalCount} non-orthogonal segments found`);
}

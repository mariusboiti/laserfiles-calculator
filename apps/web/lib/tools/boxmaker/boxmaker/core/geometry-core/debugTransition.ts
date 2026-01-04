/**
 * Debug Edge Transitions
 */

import { generateEdge, rotate90, translate, reverse } from './edgeGenerator';

console.log('🔍 Debugging edge transitions...\n');

const spec = {
  width: 106,
  height: 60,
  thickness: 3,
  fingerWidth: 10
};

// Generate edges
const topEdge = generateEdge({
  length: spec.width,
  thickness: spec.thickness,
  fingerWidth: spec.fingerWidth,
  mode: 'flat'
});

const rightEdge = generateEdge({
  length: spec.height,
  thickness: spec.thickness,
  fingerWidth: spec.fingerWidth,
  mode: 'fingers-out'
});

console.log('TOP edge (last 3 points):');
topEdge.slice(-3).forEach((p, i) => {
  const idx = topEdge.length - 3 + i;
  console.log(`  ${idx}: (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`);
});

console.log('\nRIGHT edge (first 3 points):');
rightEdge.slice(0, 3).forEach((p, i) => {
  console.log(`  ${i}: (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`);
});

// Position edges
const positionedTop = topEdge; // At (0,0)
const positionedRight = translate(rotate90(rightEdge), spec.width, 0);

console.log('\nPOSITIONED TOP (last 3 points):');
positionedTop.slice(-3).forEach((p, i) => {
  const idx = positionedTop.length - 3 + i;
  console.log(`  ${idx}: (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`);
});

console.log('\nPOSITIONED RIGHT (first 3 points):');
positionedRight.slice(0, 3).forEach((p, i) => {
  console.log(`  ${i}: (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`);
});

// Check transition
const lastTop = positionedTop[positionedTop.length - 1];
const firstRight = positionedRight[0];

console.log('\nTransition check:');
console.log(`  Last top:     (${lastTop.x.toFixed(1)}, ${lastTop.y.toFixed(1)})`);
console.log(`  First right:  (${firstRight.x.toFixed(1)}, ${firstRight.y.toFixed(1)})`);
console.log(`  Should be same for clean corner`);

if (Math.abs(lastTop.x - firstRight.x) > 0.001 || Math.abs(lastTop.y - firstRight.y) > 0.001) {
  console.error('  ❌ CORNER MISALIGNMENT!');
} else {
  console.log('  ✅ Corner aligned');
}

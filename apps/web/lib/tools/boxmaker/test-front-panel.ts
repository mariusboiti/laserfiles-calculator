import { generateHingedBoxPanels, generateHingedBoxSvgsFromPanels } from './boxmaker/core/hinged/parametricGenerator';
import type { HingedInputs } from './boxmaker/core/types';
import * as fs from 'fs';

// Test input matching current front panel
const testInput: HingedInputs = {
  widthMm: 150,
  depthMm: 150,
  heightMm: 150,
  thicknessMm: 3,
  jointFingerWidthMm: 15,
  hingeFingerWidthMm: 8,
  hingeClearanceMm: 0.2,
  hingeHoleDiameterMm: 5,
  hingeHoleInsetMm: 8,
};

// Generate panels
const panels = generateHingedBoxPanels(testInput);

// Generate SVGs in parametric mode
const svgs = generateHingedBoxSvgsFromPanels(panels, 'parametric', testInput);

// Save front panel SVG to file
fs.writeFileSync('front-panel-test.svg', svgs.front, 'utf-8');

console.log('✅ Front panel SVG generated: front-panel-test.svg');
console.log('📐 Validating path commands...');

// Check for forbidden curve commands
const hasCurves = /[CcQqAaSs]/.test(svgs.front);
if (hasCurves) {
  console.error('❌ FAILED: SVG contains curve commands (C/Q/A/S)');
  process.exit(1);
} else {
  console.log('✅ PASSED: SVG contains ONLY M/L/Z commands');
}

// Count path commands
const mCount = (svgs.front.match(/M/g) || []).length;
const lCount = (svgs.front.match(/L/g) || []).length;
const zCount = (svgs.front.match(/Z/g) || []).length;

console.log(`📊 Path statistics:`);
console.log(`   M commands: ${mCount}`);
console.log(`   L commands: ${lCount}`);
console.log(`   Z commands: ${zCount}`);
console.log(`   Total points: ${lCount + 1}`);

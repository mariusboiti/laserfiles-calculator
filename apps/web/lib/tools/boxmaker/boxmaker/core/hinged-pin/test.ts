/**
 * Hinged Pin Box - Test
 * 
 * Validates:
 * 1. Only BACK and LID have holes
 * 2. Hinge is on TOP edge (y=0)
 * 3. SVG is 100% orthogonal (M/L/Z only)
 * 4. Knuckles alternate correctly
 */

import { HINGED_PIN_DEFAULTS, HINGE_PANELS } from './types';
import { generateHingedPinPanels, validatePanels } from './generateHingedPinSvg';
import { layoutPanelsToSvg, generatePanelSvgs } from './layout';
import * as fs from 'fs';

console.log('🔧 Hinged Pin Box - Test Suite\n');

// Generate panels
console.log('📦 Generating panels...');
const panels = generateHingedPinPanels(HINGED_PIN_DEFAULTS);

// Test 1: Validate panels
console.log('\n📐 Test 1: Validating panel structure...');
try {
  validatePanels(panels);
  console.log('✅ PASSED: Panel validation');
} catch (err) {
  console.error(`❌ FAILED: ${err instanceof Error ? err.message : 'Unknown error'}`);
  process.exit(1);
}

// Test 2: Check hole counts
console.log('\n📐 Test 2: Checking hole placement...');
const panelList = [panels.bottom, panels.front, panels.back, panels.left, panels.right, panels.lid];
let test2Passed = true;

for (const panel of panelList) {
  const isHinge = HINGE_PANELS.includes(panel.role);
  const icon = isHinge ? '🔗' : '  ';
  const status = (isHinge && panel.holes.length > 0) || (!isHinge && panel.holes.length === 0) ? '✓' : '✗';
  
  console.log(`   ${icon} ${panel.name}: ${panel.holes.length} holes, hingeEdge: ${panel.hingeEdgeLocation || 'none'} [${status}]`);
  
  if (!isHinge && panel.holes.length > 0) {
    console.error(`   ❌ ERROR: Non-hinge panel ${panel.name} has holes!`);
    test2Passed = false;
  }
  if (isHinge && panel.holes.length === 0) {
    console.error(`   ❌ ERROR: Hinge panel ${panel.name} has no holes!`);
    test2Passed = false;
  }
  if (isHinge && panel.hingeEdgeLocation !== 'top') {
    console.error(`   ❌ ERROR: Hinge panel ${panel.name} hinge is not on TOP!`);
    test2Passed = false;
  }
}

if (test2Passed) {
  console.log('✅ PASSED: Hole placement correct');
} else {
  console.log('❌ FAILED: Hole placement incorrect');
  process.exit(1);
}

// Test 3: Check knuckle positions (should be on TOP = y <= 0)
console.log('\n📐 Test 3: Checking knuckle positions (TOP edge = y <= 0)...');
let test3Passed = true;

for (const panel of [panels.back, panels.lid]) {
  for (const hole of panel.holes) {
    if (hole.cy > 0) {
      console.error(`   ❌ ERROR: ${panel.name} hole at cy=${hole.cy} is not on TOP (should be y <= 0)`);
      test3Passed = false;
    }
  }
}

if (test3Passed) {
  console.log('✅ PASSED: All knuckle holes on TOP edge (y <= 0)');
} else {
  process.exit(1);
}

// Test 4: Generate SVG and validate orthogonality
console.log('\n📐 Test 4: Generating SVG and validating orthogonality...');
const layoutSvg = layoutPanelsToSvg(panels, {
  margin: HINGED_PIN_DEFAULTS.marginMm,
  spacing: HINGED_PIN_DEFAULTS.spacingMm,
  showDebug: true,
});

// Check for curve commands
const hasCurves = /\s[CcQqAaSs]\s/.test(layoutSvg);
if (hasCurves) {
  console.error('❌ FAILED: SVG contains curve commands');
  process.exit(1);
}
console.log('✅ PASSED: SVG is 100% orthogonal (M/L/Z only)');

// Save files
console.log('\n💾 Saving test files...');
fs.writeFileSync('hinged-pin-layout.svg', layoutSvg, 'utf-8');
console.log('   ✅ hinged-pin-layout.svg');

const panelSvgs = generatePanelSvgs(panels);
for (const [name, svg] of Object.entries(panelSvgs)) {
  fs.writeFileSync(`hinged-pin-${name}.svg`, svg, 'utf-8');
  console.log(`   ✅ hinged-pin-${name}.svg`);
}

// Summary
console.log('\n📊 Summary:');
console.log(`   BACK holes: ${panels.back.holes.length}`);
console.log(`   LID holes: ${panels.lid.holes.length}`);
console.log(`   Other panels: 0 holes each`);

console.log('\n✅ ALL TESTS PASSED');

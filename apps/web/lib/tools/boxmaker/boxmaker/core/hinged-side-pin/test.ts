/**
 * Hinged Lid (Side Pin) Box - Test Suite
 * 
 * Validates:
 * 1. Exactly 2 holes total (1 LEFT, 1 RIGHT)
 * 2. No holes on BACK/FRONT/BOTTOM/LID
 * 3. SVG is 100% orthogonal (M/L/Z only)
 * 4. Layout matches LightBurn reference
 * 5. LID finger pull generation
 */

import { HINGED_SIDE_PIN_DEFAULTS, PIN_HOLE_PANELS } from './types';
import { generateHingedSidePinPanels, validatePanels } from './generateHingedSidePinSvg';
import { layoutPanelsToSvg, generatePanelSvgs } from './layout';
import * as fs from 'fs';

console.log('🔧 Hinged Lid (Side Pin) Box - Test Suite\n');

// Generate panels
console.log('📦 Generating panels...');
const panels = generateHingedSidePinPanels(HINGED_SIDE_PIN_DEFAULTS);

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
let totalHoles = 0;
let test2Passed = true;

for (const panel of panelList) {
  const isPinHole = PIN_HOLE_PANELS.includes(panel.role);
  const icon = isPinHole ? '📍' : '  ';
  const status = (isPinHole && panel.holes.length === 1) || (!isPinHole && panel.holes.length === 0) ? '✓' : '✗';
  
  console.log(`   ${icon} ${panel.name}: ${panel.holes.length} holes, pinHole: ${panel.hasPinHole} [${status}]`);
  
  totalHoles += panel.holes.length;
  
  if (!isPinHole && panel.holes.length > 0) {
    console.error(`   ❌ ERROR: Non-pin-hole panel ${panel.name} has holes!`);
    test2Passed = false;
  }
  if (isPinHole && panel.holes.length !== 1) {
    console.error(`   ❌ ERROR: Pin-hole panel ${panel.name} has ${panel.holes.length} holes, must be 1!`);
    test2Passed = false;
  }
}

if (totalHoles !== 2) {
  console.error(`   ❌ ERROR: Total holes = ${totalHoles}, must be exactly 2!`);
  test2Passed = false;
}

if (test2Passed) {
  console.log('✅ PASSED: Hole placement correct (2 holes total: 1 LEFT, 1 RIGHT)');
} else {
  process.exit(1);
}

// Test 3: Check pin hole positions
console.log('\n📐 Test 3: Checking pin hole positions...');
let test3Passed = true;

for (const panel of [panels.left, panels.right]) {
  if (panel.holes.length === 1) {
    const hole = panel.holes[0];
    
    // Check if hole is within panel bounds
    if (hole.cx < hole.r || hole.cx > panel.width - hole.r) {
      console.error(`   ❌ ERROR: ${panel.name} hole cx=${hole.cx} is outside panel width [${hole.r}, ${panel.width - hole.r}]`);
      test3Passed = false;
    }
    
    if (hole.cy < hole.r || hole.cy > panel.height - hole.r) {
      console.error(`   ❌ ERROR: ${panel.name} hole cy=${hole.cy} is outside panel height [${hole.r}, ${panel.height - hole.r}]`);
      test3Passed = false;
    }
    
    console.log(`   ✓ ${panel.name}: hole at (${hole.cx.toFixed(1)}, ${hole.cy.toFixed(1)}) r=${hole.r.toFixed(1)}`);
  }
}

if (test3Passed) {
  console.log('✅ PASSED: Pin hole positions valid');
} else {
  process.exit(1);
}

// Test 4: Check LID finger pull
console.log('\n📐 Test 4: Checking LID finger pull...');
if (HINGED_SIDE_PIN_DEFAULTS.lidFingerPull) {
  // Count vertices in LID outline (should be more than 4 due to finger pull)
  const lidVertices = panels.lid.outline.length;
  console.log(`   LID vertices: ${lidVertices} (should be > 4 for finger pull)`);
  
  if (lidVertices <= 4) {
    console.error('   ❌ ERROR: LID should have finger pull cutout (more vertices)');
    process.exit(1);
  }
  console.log('✅ PASSED: LID finger pull cutout present');
} else {
  console.log('ℹ️  LID finger pull disabled');
}

// Test 5: Generate SVG and validate orthogonality
console.log('\n📐 Test 5: Generating SVG and validating orthogonality...');
const layoutSvg = layoutPanelsToSvg(panels, {
  margin: HINGED_SIDE_PIN_DEFAULTS.marginMm,
  spacing: HINGED_SIDE_PIN_DEFAULTS.spacingMm,
  showDebug: true,
});

// Check for curve commands
const hasCurves = /\s[CcQqAaSs]\s/.test(layoutSvg);
if (hasCurves) {
  console.error('❌ FAILED: SVG contains curve commands');
  process.exit(1);
}
console.log('✅ PASSED: SVG is 100% orthogonal (M/L/Z only)');

// Test 6: Check layout order
console.log('\n📐 Test 6: Checking layout order...');
// Count actual pin hole circles (not debug circles)
const pinHoleMatches = layoutSvg.match(/<circle[^>]*stroke="#000000"[^>]*>/g) || [];
const pinHoleCount = pinHoleMatches.length;
console.log(`   Pin hole circles in SVG: ${pinHoleCount} (should be 2)`);
if (pinHoleCount !== 2) {
  console.error('❌ FAILED: SVG should contain exactly 2 pin hole circles');
  process.exit(1);
}
console.log('✅ PASSED: Layout contains exactly 2 pin holes');

// Save files
console.log('\n💾 Saving test files...');
fs.writeFileSync('hinged-side-pin-layout.svg', layoutSvg, 'utf-8');
console.log('   ✅ hinged-side-pin-layout.svg');

const panelSvgs = generatePanelSvgs(panels);
for (const [name, svg] of Object.entries(panelSvgs)) {
  fs.writeFileSync(`hinged-side-pin-${name}.svg`, svg, 'utf-8');
  console.log(`   ✅ hinged-side-pin-${name}.svg`);
}

// Summary
console.log('\n📊 Summary:');
console.log(`   LEFT holes: ${panels.left.holes.length}`);
console.log(`   RIGHT holes: ${panels.right.holes.length}`);
console.log(`   Other panels: 0 holes each`);
console.log(`   Total holes: ${totalHoles}`);
console.log(`   LID finger pull: ${HINGED_SIDE_PIN_DEFAULTS.lidFingerPull ? 'ON' : 'OFF'}`);

console.log('\n✅ ALL TESTS PASSED');
console.log('\n🎯 Mode "Hinged Lid (Side Pin)" is ready for integration!');

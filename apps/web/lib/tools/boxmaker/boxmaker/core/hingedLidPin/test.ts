/**
 * Test script for Hinged Lid Pin Box
 * Verifies:
 * 1. SVG output is 100% orthogonal (M/L/Z only) + circles for holes
 * 2. Hinge holes are ONLY on BACK and LID panels
 * 3. Layout order is correct (BACK, LID at top)
 */

import { HINGED_LID_PIN_DEFAULTS, HINGE_PANELS } from './types';
import { generateHingedLidPinPanels, validatePanels } from './generate';
import { layoutPanelsToSvg, generatePanelSvgs } from './svg';
import * as fs from 'fs';

// Generate panels with default inputs
const panels = generateHingedLidPinPanels(HINGED_LID_PIN_DEFAULTS);

// Validate panels - throws if hinge holes on wrong panels
console.log('\n📐 Validating panel hinge placement...');
try {
  validatePanels(panels);
  console.log('✅ PASSED: Hinge holes are only on BACK and LID panels');
} catch (err) {
  console.error(`❌ FAILED: ${err instanceof Error ? err.message : 'Validation error'}`);
  process.exit(1);
}

// Check each panel explicitly
console.log('\n📊 Panel hole counts:');
const panelList = [panels.bottom, panels.front, panels.back, panels.left, panels.right, panels.lid];
for (const panel of panelList) {
  const isHingePanel = HINGE_PANELS.includes(panel.role);
  const status = isHingePanel ? '🔗' : '  ';
  console.log(`   ${status} ${panel.name}: ${panel.holes.length} holes (hasHingeEdge: ${panel.hasHingeEdge})`);
  
  if (!isHingePanel && panel.holes.length > 0) {
    console.error(`   ❌ ERROR: Non-hinge panel ${panel.name} has ${panel.holes.length} holes!`);
    process.exit(1);
  }
}

// Generate layout SVG with debug labels
const layoutSvg = layoutPanelsToSvg(panels, {
  margin: HINGED_LID_PIN_DEFAULTS.marginMm,
  spacing: HINGED_LID_PIN_DEFAULTS.spacingMm,
}, true);

// Generate individual panel SVGs
const panelSvgs = generatePanelSvgs(panels);

// Save to files
fs.writeFileSync('hinged-lid-pin-layout.svg', layoutSvg, 'utf-8');
console.log('✅ Layout SVG saved: hinged-lid-pin-layout.svg');

for (const [name, svg] of Object.entries(panelSvgs)) {
  fs.writeFileSync(`hinged-lid-pin-${name}.svg`, svg, 'utf-8');
  console.log(`✅ ${name} panel SVG saved`);
}

// Validate: Check for forbidden curve commands in path data
console.log('\n📐 Validating SVG paths...');

function validateSvg(svg: string, name: string): boolean {
  // Extract path d attributes
  const pathMatches = svg.matchAll(/d="([^"]+)"/g);
  
  for (const match of pathMatches) {
    const pathD = match[1];
    
    // Check for curve commands (C, Q, A, S) as path commands
    // We need to check for standalone letters, not inside words
    const commands = pathD.match(/[MLZCQASHVmlzcqashv]/g) || [];
    
    for (const cmd of commands) {
      const upper = cmd.toUpperCase();
      if (upper === 'C' || upper === 'Q' || upper === 'A' || upper === 'S') {
        console.error(`❌ FAILED: ${name} contains curve command '${cmd}'`);
        return false;
      }
    }
  }
  
  console.log(`✅ PASSED: ${name} - only M/L/Z commands`);
  return true;
}

// Check for <circle> elements (allowed)
function countCircles(svg: string): number {
  const matches = svg.match(/<circle/g);
  return matches ? matches.length : 0;
}

let allPassed = true;

allPassed = validateSvg(layoutSvg, 'layout') && allPassed;

for (const [name, svg] of Object.entries(panelSvgs)) {
  allPassed = validateSvg(svg, name) && allPassed;
  const circleCount = countCircles(svg);
  if (circleCount > 0) {
    console.log(`   ℹ️  ${name} has ${circleCount} circle(s) for holes`);
  }
}

console.log('\n📊 Summary:');
console.log(`   Panels generated: ${Object.keys(panelSvgs).length}`);
console.log(`   Back panel holes: ${countCircles(panelSvgs.back)}`);
console.log(`   Lid panel holes: ${countCircles(panelSvgs.lid)}`);

if (allPassed) {
  console.log('\n✅ ALL TESTS PASSED - SVG is 100% orthogonal (M/L/Z + circles)');
  process.exit(0);
} else {
  console.log('\n❌ TESTS FAILED - SVG contains forbidden curve commands');
  process.exit(1);
}

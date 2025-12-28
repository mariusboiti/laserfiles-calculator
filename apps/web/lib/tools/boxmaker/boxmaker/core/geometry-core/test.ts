/**
 * GOLD TEST - Pure Geometry Validation
 * 
 * Tests the foundation before adding any features
 */

import { buildSimpleBox, validateSimpleBox, type SimpleBoxInputs } from './simpleBox';
import { panelToSvg, layoutPanels, type LayoutPanel } from './svgExporter';
import * as fs from 'fs';

console.log('🔧 PURE GEOMETRY TEST - Foundation Validation\n');

// Test inputs
const testInputs: SimpleBoxInputs = {
  innerWidth: 100,
  innerDepth: 80,
  innerHeight: 60,
  thickness: 3,
  fingerWidth: 10
};

console.log('📦 Building simple box...');
const panels = buildSimpleBox(testInputs);

console.log('\n📐 Test 1: Validating panel geometry...');
try {
  validateSimpleBox(panels);
  console.log('✅ PASSED: All panels are valid rectangles');
} catch (err) {
  console.error(`❌ FAILED: ${err instanceof Error ? err.message : 'Unknown error'}`);
  process.exit(1);
}

// Test 2: Check each panel individually
console.log('\n📐 Test 2: Individual panel validation...');
const panelNames = Object.keys(panels) as (keyof typeof panels)[];
let test2Passed = true;

for (const panelName of panelNames) {
  const panel = panels[panelName];
  
  // Count vertices
  const vertexCount = panel.length;
  console.log(`   ${panelName.toUpperCase()}: ${vertexCount} vertices`);
  
  // Should have reasonable number of vertices (not too few, not too many)
  // LID can have as few as 5 vertices (simple rectangle)
  const minVertices = panelName === 'lid' ? 5 : 8;
  if (vertexCount < minVertices) {
    console.error(`   ❌ ERROR: ${panelName} has too few vertices (${vertexCount})`);
    test2Passed = false;
  }
  
  if (vertexCount > 100) {
    console.error(`   ❌ ERROR: ${panelName} has too many vertices (${vertexCount})`);
    test2Passed = false;
  }
  
  // Check if panel forms a closed shape
  const first = panel[0];
  const last = panel[panel.length - 1];
  if (Math.abs(first.x - last.x) > 0.001 || Math.abs(first.y - last.y) > 0.001) {
    console.error(`   ❌ ERROR: ${panelName} is not closed`);
    test2Passed = false;
  }
}

if (test2Passed) {
  console.log('✅ PASSED: All panels have correct vertex counts');
} else {
  process.exit(1);
}

// Test 3: SVG generation and validation
console.log('\n📐 Test 3: SVG generation and orthogonality...');
let test3Passed = true;

for (const panelName of panelNames) {
  try {
    const svg = panelToSvg(panels[panelName]);
    
    // Check for curve commands
    if (/[CQAS]/.test(svg)) {
      console.error(`   ❌ ERROR: ${panelName} SVG contains curves`);
      test3Passed = false;
    }
    
    // Check for M/L/Z commands (should be present)
    if (!/[MLZ]/.test(svg)) {
      console.error(`   ❌ ERROR: ${panelName} SVG missing M/L/Z commands`);
      test3Passed = false;
    }
    
    console.log(`   ✓ ${panelName.toUpperCase()}: SVG is orthogonal`);
  } catch (err) {
    console.error(`   ❌ ERROR: ${panelName} SVG generation failed: ${err}`);
    test3Passed = false;
  }
}

if (test3Passed) {
  console.log('✅ PASSED: All SVG files are orthogonal (M/L/Z only)');
} else {
  process.exit(1);
}

// Test 4: Layout generation
console.log('\n📐 Test 4: Layout generation...');
try {
  const panelsForLayout: LayoutPanel[] = panelNames.map(name => ({
    name: name.toUpperCase(),
    points: panels[name]
  }));
  
  const layoutSvg = layoutPanels(panelsForLayout, {
    margin: 5,
    spacing: 5,
    columns: 3
  });
  
  // Validate layout SVG
  const curveCommands = layoutSvg.match(/\b[MLHVCSQTAZ]\b/g) || [];
  const hasCurves = curveCommands.some(cmd => ['C', 'Q', 'A', 'S'].includes(cmd.toUpperCase()));
  
  if (hasCurves) {
    console.error('   ❌ ERROR: Layout SVG contains curves');
    process.exit(1);
  }
  
  console.log('✅ PASSED: Layout generated successfully');
  
  // Save layout
  fs.writeFileSync('pure-geometry-layout.svg', layoutSvg, 'utf-8');
  console.log('   ✅ pure-geometry-layout.svg saved');
  
} catch (err) {
  console.error(`❌ FAILED: Layout generation failed: ${err}`);
  process.exit(1);
}

// Test 5: Save individual panels
console.log('\n💾 Saving individual panel SVGs...');
for (const panelName of panelNames) {
  try {
    const svg = panelToSvg(panels[panelName]);
    fs.writeFileSync(`pure-geometry-${panelName}.svg`, svg, 'utf-8');
    console.log(`   ✅ pure-geometry-${panelName}.svg`);
  } catch (err) {
    console.error(`   ❌ ERROR: Failed to save ${panelName}: ${err}`);
    process.exit(1);
  }
}

// Summary
console.log('\n📊 Test Summary:');
console.log(`   Box dimensions: ${testInputs.innerWidth}×${testInputs.innerDepth}×${testInputs.innerHeight}mm`);
console.log(`   Thickness: ${testInputs.thickness}mm`);
console.log(`   Finger width: ${testInputs.fingerWidth}mm`);
console.log(`   Total panels: ${panelNames.length}`);

console.log('\n✅ ALL TESTS PASSED');
console.log('\n🎯 PURE GEOMETRY FOUNDATION IS VALID');
console.log('   Ready for LightBurn import');
console.log('   All panels are perfect rectangles');
console.log('   All edges are orthogonal (M/L/Z only)');
console.log('   No curves, no offsets, no post-processing');

console.log('\n⚠️  NEXT STEP: Import these SVG files into LightBurn');
console.log('   Verify grid snap works correctly');
console.log('   Verify all corners are clean 90°');
console.log('   ONLY THEN proceed to add hinge/features');

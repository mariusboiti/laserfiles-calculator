/**
 * Debug layout curves issue
 */

import { buildSimpleBox } from './simpleBox';
import { layoutPanels } from './svgExporter';
import * as fs from 'fs';

console.log('🔍 Debugging layout curves issue...\n');

const inputs = {
  innerWidth: 100,
  innerDepth: 80,
  innerHeight: 60,
  thickness: 3,
  fingerWidth: 10
};

const panels = buildSimpleBox(inputs);

// Test individual panels first
console.log('Testing individual panels for curves...');
const panelNames = Object.keys(panels) as (keyof typeof panels)[];
for (const panelName of panelNames) {
  const panel = panels[panelName];
  
  // Convert to simple path string to check
  let pathStr = '';
  for (let i = 0; i < panel.length; i++) {
    const p = panel[i];
    if (i === 0) {
      pathStr += `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    } else {
      pathStr += ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    }
  }
  pathStr += ' Z';
  
  const hasCurves = /[CQAS]/.test(pathStr);
  console.log(`  ${panelName.toUpperCase()}: ${hasCurves ? '❌ HAS CURVES' : '✅ Orthogonal'}`);
  
  if (hasCurves) {
    console.error(`    Path: ${pathStr}`);
  }
}

// Test layout generation
console.log('\nTesting layout generation...');
try {
  const panelsForLayout = panelNames.map(name => ({
    name: name.toUpperCase(),
    points: panels[name]
  }));
  
  const layoutSvg = layoutPanels(panelsForLayout, {
    margin: 5,
    spacing: 5,
    columns: 3
  });
  
  // Save layout to inspect
  fs.writeFileSync('debug-layout.svg', layoutSvg, 'utf-8');
  console.log('  ✅ Layout saved to debug-layout.svg');
  
  // Check for curves in layout
  const hasCurves = /[CQAS]/.test(layoutSvg);
  console.log(`  Layout: ${hasCurves ? '❌ HAS CURVES' : '✅ Orthogonal'}`);
  
  if (hasCurves) {
    // Find where curves are
    const curveMatches = layoutSvg.match(/.[CQAS]/g) || [];
    console.error(`  Found ${curveMatches.length} curve commands: ${curveMatches.join(', ')}`);
    
    // Show some context around curves
    const curveIndex = layoutSvg.search(/[CQAS]/);
    const start = Math.max(0, curveIndex - 50);
    const end = Math.min(layoutSvg.length, curveIndex + 50);
    console.error(`  Context: ...${layoutSvg.substring(start, end)}...`);
  }
  
} catch (err) {
  console.error(`  ❌ Layout generation failed: ${err}`);
}

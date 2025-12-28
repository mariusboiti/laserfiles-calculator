/**
 * Test to verify Simple Box and Hinged Box produce identical panels
 */

import { buildSimpleBox } from './simpleBox';
import { buildHingedBox } from './hingedBox';

const testInputs = {
  innerWidth: 100,
  innerDepth: 80,
  innerHeight: 60,
  thickness: 3,
  fingerWidth: 10,
  enableHinge: false,
  hingePinDiameter: 3,
  hingePinInsetFromTop: 10,
  hingePinInsetFromBack: 10,
  hingeClearance: 0.2,
};

console.log('Testing Simple Box vs Hinged Box...');

const simplePanels = buildSimpleBox(testInputs);
const hingedPanels = buildHingedBox(testInputs);

const panelNames = ['front', 'back', 'left', 'right', 'bottom', 'lid'] as const;

for (const panelName of panelNames) {
  const simple = simplePanels[panelName];
  const hinged = hingedPanels[panelName];
  
  console.log(`\n${panelName.toUpperCase()}:`);
  console.log(`  Simple: ${simple.length} points`);
  console.log(`  Hinged: ${hinged.length} points`);
  
  if (simple.length !== hinged.length) {
    console.error(`  ❌ DIFFERENT point counts!`);
    continue;
  }
  
  let hasDifference = false;
  for (let i = 0; i < simple.length; i++) {
    const s = simple[i];
    const h = hinged[i];
    
    if (Math.abs(s.x - h.x) > 0.001 || Math.abs(s.y - h.y) > 0.001) {
      console.error(`  ❌ Point ${i} differs: Simple(${s.x.toFixed(3)},${s.y.toFixed(3)}) vs Hinged(${h.x.toFixed(3)},${h.y.toFixed(3)})`);
      hasDifference = true;
      if (i > 5) {
        console.error(`  ... (stopping after first few differences)`);
        break;
      }
    }
  }
  
  if (!hasDifference) {
    console.log(`  ✓ IDENTICAL`);
  }
}

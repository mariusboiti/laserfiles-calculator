/**
 * Regression checks for BoxMaker - ensure generated SVGs are valid
 */

import type { HingedBoxSvgs, HingedBoxPanels, SlidingDrawerSvgs } from './types';

export interface RegressionCheckResult {
  passed: boolean;
  checks: {
    name: string;
    passed: boolean;
    message?: string;
  }[];
}

/**
 * Check if string contains NaN values
 */
function containsNaN(str: string | undefined | null): boolean {
  if (!str || typeof str !== 'string') return false;
  return str.includes('NaN') || str.includes('nan');
}

/**
 * Check if SVG has expected structure
 */
function isValidSvg(svg: string | undefined | null): boolean {
  if (!svg || typeof svg !== 'string') return false;
  return (
    svg.includes('<?xml') &&
    svg.includes('<svg') &&
    svg.includes('</svg>') &&
    svg.includes('xmlns="http://www.w3.org/2000/svg"')
  );
}

/**
 * Check if SVG has laser-safe attributes
 */
function isLaserSafe(svg: string | undefined | null): boolean {
  if (!svg || typeof svg !== 'string') return false;
  // Check for fill="none" on paths
  const pathMatches = svg.match(/<path[^>]*>/g);
  if (pathMatches) {
    for (const match of pathMatches) {
      if (!match.includes('fill="none"')) {
        return false;
      }
    }
  }
  
  // Check for no gradients or filters
  if (svg.includes('<linearGradient') || svg.includes('<radialGradient') || svg.includes('<filter')) {
    return false;
  }
  
  return true;
}

/**
 * Run regression checks on hinged box SVGs
 */
export function checkHingedBoxSvgs(svgs: HingedBoxSvgs, panels: HingedBoxPanels): RegressionCheckResult {
  const checks: RegressionCheckResult['checks'] = [];
  
  // Check panel count
  const panelKeys = Object.keys(svgs) as (keyof HingedBoxSvgs)[];
  checks.push({
    name: 'Panel count',
    passed: panelKeys.length === 6,
    message: panelKeys.length === 6 ? 'All 6 panels present' : `Expected 6 panels, got ${panelKeys.length}`,
  });
  
  // Check for NaN in SVGs
  let hasNaN = false;
  for (const key of panelKeys) {
    if (containsNaN(svgs[key])) {
      hasNaN = true;
      checks.push({
        name: `No NaN in ${key}`,
        passed: false,
        message: `Panel ${key} contains NaN values`,
      });
    }
  }
  if (!hasNaN) {
    checks.push({
      name: 'No NaN values',
      passed: true,
      message: 'All panels free of NaN',
    });
  }
  
  // Check SVG validity
  let allValid = true;
  for (const key of panelKeys) {
    if (!isValidSvg(svgs[key])) {
      allValid = false;
      checks.push({
        name: `Valid SVG: ${key}`,
        passed: false,
        message: `Panel ${key} has invalid SVG structure`,
      });
    }
  }
  if (allValid) {
    checks.push({
      name: 'Valid SVG structure',
      passed: true,
      message: 'All panels have valid SVG',
    });
  }
  
  // Check laser safety
  let allLaserSafe = true;
  for (const key of panelKeys) {
    if (!isLaserSafe(svgs[key])) {
      allLaserSafe = false;
      checks.push({
        name: `Laser-safe: ${key}`,
        passed: false,
        message: `Panel ${key} is not laser-safe`,
      });
    }
  }
  if (allLaserSafe) {
    checks.push({
      name: 'Laser-safe SVG',
      passed: true,
      message: 'All panels are laser-safe',
    });
  }
  
  // Check hinge complementary (left and right panels should have matching hole counts)
  if (panels.left.holes && panels.right.holes) {
    const leftHoleCount = panels.left.holes.length;
    const rightHoleCount = panels.right.holes.length;
    checks.push({
      name: 'Hinge complementary',
      passed: leftHoleCount === rightHoleCount,
      message: leftHoleCount === rightHoleCount 
        ? `Left and right panels have ${leftHoleCount} matching holes`
        : `Hole count mismatch: left=${leftHoleCount}, right=${rightHoleCount}`,
    });
  }
  
  const passed = checks.every((c) => c.passed);
  return { passed, checks };
}

/**
 * Run regression checks on sliding drawer SVGs
 */
export function checkSlidingDrawerSvgs(svgs: SlidingDrawerSvgs): RegressionCheckResult {
  const checks: RegressionCheckResult['checks'] = [];
  
  // Check panel count
  const outerKeys = Object.keys(svgs.outer);
  const drawerKeys = Object.keys(svgs.drawer);
  const totalPanels = outerKeys.length + drawerKeys.length + (svgs.frontFace ? 1 : 0);
  checks.push({
    name: 'Panel count',
    passed: totalPanels >= 9,
    message: `Generated ${totalPanels} panels`,
  });
  
  // Check for NaN in all SVGs
  let hasNaN = false;
  const allSvgs = [
    ...Object.values(svgs.outer),
    ...Object.values(svgs.drawer),
    ...(svgs.frontFace ? [svgs.frontFace] : []),
  ];
  
  for (const svg of allSvgs) {
    if (containsNaN(svg)) {
      hasNaN = true;
      break;
    }
  }
  checks.push({
    name: 'No NaN values',
    passed: !hasNaN,
    message: hasNaN ? 'Some panels contain NaN values' : 'All panels free of NaN',
  });
  
  // Check SVG validity
  let allValid = true;
  for (const svg of allSvgs) {
    if (!isValidSvg(svg)) {
      allValid = false;
      break;
    }
  }
  checks.push({
    name: 'Valid SVG structure',
    passed: allValid,
    message: allValid ? 'All panels have valid SVG' : 'Some panels have invalid SVG',
  });
  
  // Check laser safety
  let allLaserSafe = true;
  for (const svg of allSvgs) {
    if (!isLaserSafe(svg)) {
      allLaserSafe = false;
      break;
    }
  }
  checks.push({
    name: 'Laser-safe SVG',
    passed: allLaserSafe,
    message: allLaserSafe ? 'All panels are laser-safe' : 'Some panels are not laser-safe',
  });
  
  const passed = checks.every((c) => c.passed);
  return { passed, checks };
}

/**
 * Format regression check results for display
 */
export function formatCheckResults(result: RegressionCheckResult): string {
  const lines: string[] = [];
  lines.push(result.passed ? '✅ All checks passed' : '❌ Some checks failed');
  lines.push('');
  
  for (const check of result.checks) {
    const icon = check.passed ? '✓' : '✗';
    lines.push(`${icon} ${check.name}: ${check.message || (check.passed ? 'OK' : 'FAIL')}`);
  }
  
  return lines.join('\n');
}

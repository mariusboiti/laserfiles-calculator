// Extract absolute coordinates from SVG paths
const fs = require('fs');

const svgContent = fs.readFileSync('original-box.svg', 'utf8');
const pathMatches = svgContent.matchAll(/<path[^>]*d="([^"]+)"[^>]*>/g);
const paths = Array.from(pathMatches).map(m => m[1]);

function parsePathToAbsoluteCoords(pathData) {
  const commands = pathData.match(/[MLmlhvHVcCzZ][^MLmlhvHVcCzZ]*/g) || [];
  
  let x = 0, y = 0;
  let startX = 0, startY = 0;
  const coords = [];
  
  commands.forEach((cmd, i) => {
    const type = cmd[0];
    const args = cmd.slice(1).trim().split(/[\s,]+/).filter(v => v).map(v => parseFloat(v));
    
    switch(type) {
      case 'M':
        x = args[0];
        y = args[1];
        if (i === 0) { startX = x; startY = y; }
        coords.push({ x, y, type: 'M' });
        break;
      case 'm':
        x += args[0] || 0;
        y += args[1] || 0;
        if (i === 0) { startX = x; startY = y; }
        coords.push({ x, y, type: 'm' });
        break;
      case 'l':
        x += args[0] || 0;
        y += args[1] || 0;
        coords.push({ x, y, type: 'l' });
        break;
      case 'L':
        x = args[0];
        y = args[1];
        coords.push({ x, y, type: 'L' });
        break;
      case 'h':
        x += args[0];
        coords.push({ x, y, type: 'h' });
        break;
      case 'H':
        x = args[0];
        coords.push({ x, y, type: 'H' });
        break;
      case 'v':
        y += args[0];
        coords.push({ x, y, type: 'v' });
        break;
      case 'V':
        y = args[0];
        coords.push({ x, y, type: 'V' });
        break;
      case 'c':
      case 'C':
        // Skip bezier curves for now
        if (type === 'c') {
          x += args[4] || 0;
          y += args[5] || 0;
        } else {
          x = args[4];
          y = args[5];
        }
        coords.push({ x, y, type: type + '(curve)' });
        break;
      case 'z':
      case 'Z':
        coords.push({ x: startX, y: startY, type: 'Z' });
        break;
    }
  });
  
  return coords;
}

// Analyze each path
paths.forEach((pathData, index) => {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`PATH ${index + 1}`);
  console.log('='.repeat(80));
  
  const coords = parsePathToAbsoluteCoords(pathData);
  
  // Filter out move commands to get actual outline
  const outline = coords.filter(c => c.type === 'l' || c.type === 'L' || c.type === 'M' || c.type === 'Z');
  
  // Calculate bounding box
  const xs = outline.map(p => p.x);
  const ys = outline.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  
  console.log(`Dimensions: ${(maxX - minX).toFixed(2)}mm × ${(maxY - minY).toFixed(2)}mm`);
  console.log(`Bounding box: (${minX.toFixed(1)}, ${minY.toFixed(1)}) to (${maxX.toFixed(1)}, ${maxY.toFixed(1)})`);
  console.log(`\nOutline points (${outline.length} total):`);
  
  // Group points by edge
  const edges = { top: [], right: [], bottom: [], left: [] };
  
  for (let i = 0; i < outline.length - 1; i++) {
    const p1 = outline[i];
    const p2 = outline[i + 1];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    
    if (Math.abs(dy) < 0.01) {
      // Horizontal edge
      if (Math.abs(p1.y - minY) < 1) {
        edges.top.push({ from: p1.x, to: p2.x, y: p1.y, length: Math.abs(dx) });
      } else if (Math.abs(p1.y - maxY) < 1) {
        edges.bottom.push({ from: p1.x, to: p2.x, y: p1.y, length: Math.abs(dx) });
      }
    } else if (Math.abs(dx) < 0.01) {
      // Vertical edge
      if (Math.abs(p1.x - minX) < 1) {
        edges.left.push({ from: p1.y, to: p2.y, x: p1.x, length: Math.abs(dy) });
      } else if (Math.abs(p1.x - maxX) < 1) {
        edges.right.push({ from: p1.y, to: p2.y, x: p1.x, length: Math.abs(dy) });
      }
    }
  }
  
  // Analyze finger patterns on each edge
  ['top', 'right', 'bottom', 'left'].forEach(edge => {
    if (edges[edge].length > 0) {
      console.log(`\n${edge.toUpperCase()} edge:`);
      const segments = edges[edge];
      const lengths = segments.map(s => s.length.toFixed(2));
      console.log(`  Segments (${segments.length}): ${lengths.join(', ')}`);
      
      // Count unique lengths
      const uniqueLengths = [...new Set(lengths)];
      if (uniqueLengths.length <= 3) {
        console.log(`  Unique lengths: ${uniqueLengths.join(', ')}`);
      }
    }
  });
  
  // Print first 20 coordinates for manual inspection
  console.log(`\nFirst 20 coordinates:`);
  outline.slice(0, 20).forEach((p, i) => {
    console.log(`  ${i}: (${p.x.toFixed(2)}, ${p.y.toFixed(2)}) [${p.type}]`);
  });
});

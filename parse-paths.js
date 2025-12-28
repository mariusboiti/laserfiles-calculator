// Detailed SVG path parser
const fs = require('fs');

const svgContent = fs.readFileSync('original-box.svg', 'utf8');

// Extract all path elements with their d attributes
const pathMatches = svgContent.matchAll(/<path[^>]*d="([^"]+)"[^>]*>/g);
const paths = Array.from(pathMatches).map(m => m[1]);

console.log(`Found ${paths.length} paths\n`);

// Parse each path
paths.forEach((pathData, index) => {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`PATH ${index + 1}`);
  console.log('='.repeat(80));
  
  // Split into commands
  const commands = pathData.match(/[MLmlhvHVzZ][^MLmlhvHVzZ]*/g) || [];
  
  let x = 0, y = 0;
  let startX = 0, startY = 0;
  const points = [];
  const segments = [];
  
  commands.forEach((cmd, i) => {
    const type = cmd[0];
    const args = cmd.slice(1).trim().split(/[\s,]+/).filter(v => v).map(v => parseFloat(v));
    
    let prevX = x, prevY = y;
    
    switch(type) {
      case 'M': // absolute moveto
        x = args[0];
        y = args[1];
        startX = x;
        startY = y;
        points.push({ x, y, cmd: 'M' });
        break;
      case 'm': // relative moveto
        x += args[0];
        y += args[1];
        if (i === 0) {
          startX = x;
          startY = y;
        }
        points.push({ x, y, cmd: 'm', dx: args[0], dy: args[1] });
        break;
      case 'l': // relative lineto
        x += args[0];
        y += args[1];
        points.push({ x, y, cmd: 'l', dx: args[0], dy: args[1] });
        
        // Detect finger pattern
        if (args[0] !== 0 && args[1] === 0) {
          segments.push({ type: 'horizontal', length: Math.abs(args[0]), dir: args[0] > 0 ? '+' : '-' });
        } else if (args[0] === 0 && args[1] !== 0) {
          segments.push({ type: 'vertical', length: Math.abs(args[1]), dir: args[1] > 0 ? '+' : '-' });
        }
        break;
      case 'L': // absolute lineto
        x = args[0];
        y = args[1];
        points.push({ x, y, cmd: 'L' });
        break;
      case 'h': // relative horizontal
        x += args[0];
        points.push({ x, y, cmd: 'h', dx: args[0] });
        segments.push({ type: 'horizontal', length: Math.abs(args[0]), dir: args[0] > 0 ? '+' : '-' });
        break;
      case 'v': // relative vertical
        y += args[0];
        points.push({ x, y, cmd: 'v', dy: args[0] });
        segments.push({ type: 'vertical', length: Math.abs(args[0]), dir: args[0] > 0 ? '+' : '-' });
        break;
      case 'c': // relative cubic bezier (for circles)
        // Skip for now
        break;
      case 'z':
      case 'Z':
        points.push({ x: startX, y: startY, cmd: 'Z' });
        break;
    }
  });
  
  // Calculate bounding box
  const xs = points.filter(p => !isNaN(p.x)).map(p => p.x);
  const ys = points.filter(p => !isNaN(p.y)).map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = maxX - minX;
  const height = maxY - minY;
  
  console.log(`\nDimensions: ${width.toFixed(2)}mm × ${height.toFixed(2)}mm`);
  console.log(`Position: (${minX.toFixed(2)}, ${minY.toFixed(2)}) to (${maxX.toFixed(2)}, ${maxY.toFixed(2)})`);
  console.log(`\nTotal segments: ${segments.length}`);
  
  // Analyze finger patterns
  if (segments.length > 10) {
    console.log('\nFinger pattern analysis:');
    
    // Group consecutive segments by direction
    let currentDir = null;
    let currentGroup = [];
    const groups = [];
    
    segments.forEach(seg => {
      const dir = seg.type === 'horizontal' ? 'H' : 'V';
      if (dir !== currentDir) {
        if (currentGroup.length > 0) {
          groups.push({ dir: currentDir, segments: currentGroup });
        }
        currentDir = dir;
        currentGroup = [seg];
      } else {
        currentGroup.push(seg);
      }
    });
    if (currentGroup.length > 0) {
      groups.push({ dir: currentDir, segments: currentGroup });
    }
    
    // Analyze each edge
    groups.forEach((group, gi) => {
      if (group.segments.length > 3) {
        console.log(`\n  Edge ${gi + 1} (${group.dir === 'H' ? 'Horizontal' : 'Vertical'}):`);
        
        // Detect finger pattern
        const lengths = group.segments.map(s => s.length);
        const uniqueLengths = [...new Set(lengths)];
        
        if (uniqueLengths.length <= 3) {
          console.log(`    Pattern: ${lengths.map(l => l.toFixed(2)).join(', ')}`);
          
          // Count male vs female
          let maleCount = 0, femaleCount = 0;
          for (let i = 0; i < group.segments.length; i++) {
            const seg = group.segments[i];
            const nextSeg = group.segments[i + 1];
            
            // Male finger: perpendicular out, along, perpendicular in
            if (nextSeg && i + 2 < group.segments.length) {
              const seg2 = group.segments[i + 2];
              if (seg.type !== nextSeg.type && nextSeg.type === group.dir.toLowerCase() && seg2.type === seg.type) {
                maleCount++;
                i += 2; // Skip the next two segments
              }
            }
          }
          femaleCount = Math.floor((group.segments.length - maleCount * 3) / 1);
          
          console.log(`    Estimated: ${maleCount} male, ${femaleCount} female`);
        }
      }
    });
  }
});

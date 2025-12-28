// Script to analyze SVG paths and extract panel dimensions
const fs = require('fs');

const svgContent = fs.readFileSync('original-box.svg', 'utf8');

// Extract all path d attributes
const pathRegex = /d="([^"]+)"/g;
const paths = [];
let match;

while ((match = pathRegex.exec(svgContent)) !== null) {
  paths.push(match[1]);
}

console.log(`Found ${paths.length} paths\n`);

paths.forEach((path, index) => {
  console.log(`\n=== PATH ${index + 1} ===`);
  console.log(path);
  
  // Parse path commands
  const commands = path.match(/[MLmlhv][^MLmlhv]*/g);
  if (commands) {
    console.log(`\nCommands: ${commands.length}`);
    
    // Extract key coordinates
    const coords = [];
    let currentX = 0, currentY = 0;
    
    commands.forEach(cmd => {
      const type = cmd[0];
      const values = cmd.slice(1).trim().split(/[\s,]+/).map(v => parseFloat(v));
      
      if (type === 'M') {
        currentX = values[0];
        currentY = values[1];
        coords.push({ x: currentX, y: currentY, type: 'M' });
      } else if (type === 'l') {
        currentX += values[0];
        currentY += values[1];
        coords.push({ x: currentX, y: currentY, type: 'l', dx: values[0], dy: values[1] });
      } else if (type === 'm') {
        currentX += values[0];
        currentY += values[1];
        coords.push({ x: currentX, y: currentY, type: 'm', dx: values[0], dy: values[1] });
      }
    });
    
    // Find bounding box
    const xs = coords.map(c => c.x);
    const ys = coords.map(c => c.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    
    console.log(`\nBounding Box:`);
    console.log(`  X: ${minX} to ${maxX} (width: ${maxX - minX})`);
    console.log(`  Y: ${minY} to ${maxY} (height: ${maxY - minY})`);
  }
});

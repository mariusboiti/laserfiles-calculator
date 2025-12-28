import * as fs from 'fs';
import * as path from 'path';

const SOURCE_DIR = path.resolve(__dirname, '../apps/web/lib/assets/ornaments/source');
const OUTPUT_DIR = path.resolve(__dirname, '../apps/web/lib/assets/ornaments/generated');
const META_FILE = path.join(SOURCE_DIR, '_meta.json');

type LayerType = 'CUT' | 'ENGRAVE' | 'GUIDE';

interface OrnamentMeta {
  tags?: string[];
  recommendedLayer?: LayerType;
  defaultInsertWidthPct?: number;
}

interface MetaConfig {
  [id: string]: OrnamentMeta;
}

interface Ornament {
  id: string;
  name: string;
  category: string;
  pathDs: string[];
  viewBox: [number, number, number, number];
  tags: string[];
  recommendedLayer: LayerType;
  defaultInsertWidthPct: number;
}

interface PathBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function humanize(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function extractPathsFromSvg(svgContent: string): string[] {
  const paths: string[] = [];
  const pathRegex = /<path[^>]*\sd="([^"]*)"/gi;
  let match: RegExpExecArray | null;
  
  while ((match = pathRegex.exec(svgContent)) !== null) {
    if (match[1] && match[1].trim()) {
      paths.push(match[1].trim());
    }
  }
  
  return paths;
}

function parsePathCommands(d: string): Array<{ cmd: string; args: number[] }> {
  const commands: Array<{ cmd: string; args: number[] }> = [];
  
  // Split by command letters while keeping the letters
  const tokens = d.split(/([MmLlHhVvCcSsQqTtAaZz])/).filter(Boolean);
  
  let currentCmd = '';
  for (const token of tokens) {
    if (/^[MmLlHhVvCcSsQqTtAaZz]$/.test(token)) {
      currentCmd = token;
    } else if (currentCmd) {
      // Parse all numbers from the arguments string
      const numRegex = /[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;
      const args: number[] = [];
      let numMatch: RegExpExecArray | null;
      while ((numMatch = numRegex.exec(token)) !== null) {
        const val = parseFloat(numMatch[0]);
        if (!isNaN(val)) {
          args.push(val);
        }
      }
      if (args.length > 0 || currentCmd.toUpperCase() === 'Z') {
        commands.push({ cmd: currentCmd, args });
      }
      currentCmd = '';
    }
  }
  
  // Handle case where command has no following args (like Z)
  if (currentCmd && currentCmd.toUpperCase() === 'Z') {
    commands.push({ cmd: currentCmd, args: [] });
  }
  
  return commands;
}

function computePathBounds(pathD: string): PathBounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  let currentX = 0;
  let currentY = 0;
  
  const commands = parsePathCommands(pathD);
  
  const updateBounds = (x: number, y: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };
  
  for (const { cmd, args } of commands) {
    const isRelative = cmd === cmd.toLowerCase();
    const cmdUpper = cmd.toUpperCase();
    
    if (cmdUpper === 'M' || cmdUpper === 'L') {
      for (let i = 0; i < args.length; i += 2) {
        const x = isRelative ? currentX + args[i] : args[i];
        const y = isRelative ? currentY + args[i + 1] : args[i + 1];
        updateBounds(x, y);
        currentX = x;
        currentY = y;
      }
    } else if (cmdUpper === 'H') {
      for (const arg of args) {
        const x = isRelative ? currentX + arg : arg;
        updateBounds(x, currentY);
        currentX = x;
      }
    } else if (cmdUpper === 'V') {
      for (const arg of args) {
        const y = isRelative ? currentY + arg : arg;
        updateBounds(currentX, y);
        currentY = y;
      }
    } else if (cmdUpper === 'C') {
      for (let i = 0; i < args.length; i += 6) {
        const x1 = isRelative ? currentX + args[i] : args[i];
        const y1 = isRelative ? currentY + args[i + 1] : args[i + 1];
        const x2 = isRelative ? currentX + args[i + 2] : args[i + 2];
        const y2 = isRelative ? currentY + args[i + 3] : args[i + 3];
        const x = isRelative ? currentX + args[i + 4] : args[i + 4];
        const y = isRelative ? currentY + args[i + 5] : args[i + 5];
        updateBounds(x1, y1);
        updateBounds(x2, y2);
        updateBounds(x, y);
        currentX = x;
        currentY = y;
      }
    } else if (cmdUpper === 'S' || cmdUpper === 'Q') {
      const step = cmdUpper === 'S' ? 4 : 4;
      for (let i = 0; i < args.length; i += step) {
        const x1 = isRelative ? currentX + args[i] : args[i];
        const y1 = isRelative ? currentY + args[i + 1] : args[i + 1];
        const x = isRelative ? currentX + args[i + 2] : args[i + 2];
        const y = isRelative ? currentY + args[i + 3] : args[i + 3];
        updateBounds(x1, y1);
        updateBounds(x, y);
        currentX = x;
        currentY = y;
      }
    } else if (cmdUpper === 'A') {
      for (let i = 0; i < args.length; i += 7) {
        const x = isRelative ? currentX + args[i + 5] : args[i + 5];
        const y = isRelative ? currentY + args[i + 6] : args[i + 6];
        updateBounds(x, y);
        currentX = x;
        currentY = y;
      }
    } else if (cmdUpper === 'T') {
      for (let i = 0; i < args.length; i += 2) {
        const x = isRelative ? currentX + args[i] : args[i];
        const y = isRelative ? currentY + args[i + 1] : args[i + 1];
        updateBounds(x, y);
        currentX = x;
        currentY = y;
      }
    }
  }
  
  return { minX, minY, maxX, maxY };
}

function normalizePath(pathD: string, bounds: PathBounds, targetSize: number, padding: number): string {
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  
  // Handle invalid bounds
  if (!isFinite(width) || !isFinite(height) || width <= 0 || height <= 0) {
    return pathD;
  }
  
  const availableSize = targetSize - 2 * padding;
  const scale = Math.min(availableSize / width, availableSize / height);
  
  const scaledWidth = width * scale;
  const scaledHeight = height * scale;
  const offsetX = (targetSize - scaledWidth) / 2 - bounds.minX * scale;
  const offsetY = (targetSize - scaledHeight) / 2 - bounds.minY * scale;
  
  const commands = parsePathCommands(pathD);
  let output = '';
  let currentX = 0;
  let currentY = 0;
  
  const transformX = (x: number) => Math.round((x * scale + offsetX) * 1000) / 1000;
  const transformY = (y: number) => Math.round((y * scale + offsetY) * 1000) / 1000;
  
  for (const { cmd, args } of commands) {
    const isRelative = cmd === cmd.toLowerCase();
    const cmdUpper = cmd.toUpperCase();
    
    output += cmd;
    
    if (cmdUpper === 'M' || cmdUpper === 'L' || cmdUpper === 'T') {
      for (let i = 0; i < args.length; i += 2) {
        const x = isRelative ? currentX + args[i] : args[i];
        const y = isRelative ? currentY + args[i + 1] : args[i + 1];
        const tx = transformX(x);
        const ty = transformY(y);
        output += ` ${tx} ${ty}`;
        currentX = x;
        currentY = y;
      }
    } else if (cmdUpper === 'H') {
      for (const arg of args) {
        const x = isRelative ? currentX + arg : arg;
        const tx = transformX(x);
        output += ` ${tx}`;
        currentX = x;
      }
    } else if (cmdUpper === 'V') {
      for (const arg of args) {
        const y = isRelative ? currentY + arg : arg;
        const ty = transformY(y);
        output += ` ${ty}`;
        currentY = y;
      }
    } else if (cmdUpper === 'C') {
      for (let i = 0; i < args.length; i += 6) {
        const x1 = isRelative ? currentX + args[i] : args[i];
        const y1 = isRelative ? currentY + args[i + 1] : args[i + 1];
        const x2 = isRelative ? currentX + args[i + 2] : args[i + 2];
        const y2 = isRelative ? currentY + args[i + 3] : args[i + 3];
        const x = isRelative ? currentX + args[i + 4] : args[i + 4];
        const y = isRelative ? currentY + args[i + 5] : args[i + 5];
        output += ` ${transformX(x1)} ${transformY(y1)} ${transformX(x2)} ${transformY(y2)} ${transformX(x)} ${transformY(y)}`;
        currentX = x;
        currentY = y;
      }
    } else if (cmdUpper === 'S' || cmdUpper === 'Q') {
      const step = 4;
      for (let i = 0; i < args.length; i += step) {
        const x1 = isRelative ? currentX + args[i] : args[i];
        const y1 = isRelative ? currentY + args[i + 1] : args[i + 1];
        const x = isRelative ? currentX + args[i + 2] : args[i + 2];
        const y = isRelative ? currentY + args[i + 3] : args[i + 3];
        output += ` ${transformX(x1)} ${transformY(y1)} ${transformX(x)} ${transformY(y)}`;
        currentX = x;
        currentY = y;
      }
    } else if (cmdUpper === 'A') {
      for (let i = 0; i < args.length; i += 7) {
        const rx = args[i] * scale;
        const ry = args[i + 1] * scale;
        const rotation = args[i + 2];
        const largeArc = args[i + 3];
        const sweep = args[i + 4];
        const x = isRelative ? currentX + args[i + 5] : args[i + 5];
        const y = isRelative ? currentY + args[i + 6] : args[i + 6];
        output += ` ${Math.round(rx * 1000) / 1000} ${Math.round(ry * 1000) / 1000} ${rotation} ${largeArc} ${sweep} ${transformX(x)} ${transformY(y)}`;
        currentX = x;
        currentY = y;
      }
    }
  }
  
  return output;
}

function getCategoryDefaults(category: string): { layer: LayerType; widthPct: number } {
  const cat = category.toLowerCase();
  if (cat.includes('divider')) return { layer: 'ENGRAVE', widthPct: 80 };
  if (cat.includes('corner')) return { layer: 'ENGRAVE', widthPct: 25 };
  if (cat.includes('round')) return { layer: 'ENGRAVE', widthPct: 45 };
  if (cat.includes('flower') || cat.includes('leaves')) return { layer: 'ENGRAVE', widthPct: 30 };
  return { layer: 'ENGRAVE', widthPct: 40 };
}

function scanDirectory(dir: string): string[] {
  const results: string[] = [];
  
  if (!fs.existsSync(dir)) return results;
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...scanDirectory(fullPath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.svg')) {
      results.push(fullPath);
    }
  }
  
  return results;
}

function main() {
  console.log('🎨 Generating Ornament Library...\n');
  
  const metaConfig: MetaConfig = fs.existsSync(META_FILE)
    ? JSON.parse(fs.readFileSync(META_FILE, 'utf-8'))
    : {};
  
  const svgFiles = scanDirectory(SOURCE_DIR);
  const ornaments: Ornament[] = [];
  const categoryStats: Record<string, number> = {};
  const warnings: string[] = [];
  
  for (const filePath of svgFiles) {
    const relativePath = path.relative(SOURCE_DIR, filePath);
    const parts = relativePath.split(path.sep);
    
    if (parts.length < 2) continue;
    
    const category = parts[0];
    const filename = parts[parts.length - 1];
    const filenameWithoutExt = filename.replace(/\.svg$/i, '');
    
    const id = `${slugify(category)}-${slugify(filenameWithoutExt)}`;
    const name = humanize(filenameWithoutExt);
    
    const svgContent = fs.readFileSync(filePath, 'utf-8');
    const pathDs = extractPathsFromSvg(svgContent);
    
    if (pathDs.length === 0) {
      warnings.push(`⚠️  ${relativePath}: No paths found`);
      continue;
    }
    
    const allBounds = pathDs.map(computePathBounds);
    const validBounds = allBounds.filter(b => 
      isFinite(b.minX) && isFinite(b.minY) && isFinite(b.maxX) && isFinite(b.maxY)
    );
    
    if (validBounds.length === 0) {
      warnings.push(`⚠️  ${relativePath}: Could not compute valid bounds`);
      continue;
    }
    
    const combinedBounds = validBounds.reduce(
      (acc, b) => ({
        minX: Math.min(acc.minX, b.minX),
        minY: Math.min(acc.minY, b.minY),
        maxX: Math.max(acc.maxX, b.maxX),
        maxY: Math.max(acc.maxY, b.maxY),
      }),
      { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
    );
    
    // Skip if bounds are still invalid
    if (!isFinite(combinedBounds.minX) || !isFinite(combinedBounds.maxX)) {
      warnings.push(`⚠️  ${relativePath}: Invalid combined bounds`);
      continue;
    }
    
    const normalizedPaths = pathDs.map((p) => normalizePath(p, combinedBounds, 100, 5));
    
    // Verify no NaN in output
    const hasNaN = normalizedPaths.some(p => p.includes('NaN'));
    if (hasNaN) {
      warnings.push(`⚠️  ${relativePath}: Path normalization produced NaN values, using original`);
      // Use original paths scaled to fit
      continue;
    }
    
    const defaults = getCategoryDefaults(category);
    const meta = metaConfig[id] || {};
    
    ornaments.push({
      id,
      name,
      category,
      pathDs: normalizedPaths,
      viewBox: [0, 0, 100, 100],
      tags: meta.tags || [category.toLowerCase()],
      recommendedLayer: meta.recommendedLayer || defaults.layer,
      defaultInsertWidthPct: meta.defaultInsertWidthPct || defaults.widthPct,
    });
    
    categoryStats[category] = (categoryStats[category] || 0) + 1;
  }
  
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  const libraryContent = `export type OrnamentId = ${ornaments.map((o) => `'${o.id}'`).join(' | ') || 'never'};

export type OrnamentLayerType = 'CUT' | 'ENGRAVE' | 'GUIDE';

export interface OrnamentAsset {
  id: OrnamentId;
  name: string;
  category: string;
  pathDs: string[];
  viewBox: [number, number, number, number];
  tags: string[];
  recommendedLayer: OrnamentLayerType;
  defaultInsertWidthPct: number;
}

export const ORNAMENT_LIBRARY: ReadonlyArray<OrnamentAsset> = ${JSON.stringify(ornaments, null, 2)};

export const ORNAMENT_CATEGORIES: ReadonlyArray<string> = ${JSON.stringify([...new Set(ornaments.map((o) => o.category))], null, 2)};

export function getOrnamentById(id: string): OrnamentAsset | undefined {
  return ORNAMENT_LIBRARY.find((o) => o.id === id);
}
`;
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'ornamentLibrary.ts'), libraryContent);
  
  const thumbsContent = `export const ORNAMENT_THUMBS: Record<string, string> = {
${ornaments
  .map((o) => {
    const pathsStr = o.pathDs.map((p) => `<path d="${p}" fill="none" stroke="currentColor" stroke-width="1"/>`).join('');
    const svg = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${pathsStr}</svg>`;
    return `  '${o.id}': \`${svg}\`,`;
  })
  .join('\n')}
};
`;
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'ornamentThumbs.ts'), thumbsContent);
  
  console.log('✅ Generated ornament library');
  console.log(`   Total ornaments: ${ornaments.length}`);
  console.log('   Categories:');
  for (const [cat, count] of Object.entries(categoryStats)) {
    console.log(`     - ${cat}: ${count}`);
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach((w) => console.log(`   ${w}`));
  }
  
  console.log('\n📁 Output files:');
  console.log(`   - ${path.relative(process.cwd(), path.join(OUTPUT_DIR, 'ornamentLibrary.ts'))}`);
  console.log(`   - ${path.relative(process.cwd(), path.join(OUTPUT_DIR, 'ornamentThumbs.ts'))}`);
}

main();
